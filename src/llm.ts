// Adaptateur LLM multi-fournisseurs avec cascade automatique.
//
// Ordre d'essai : Groq (gros quota gratuit + rapide) → Gemini (filet de secours).
// Chaque appel bascule sur le fournisseur suivant en cas de panne/quota (429/503/
// réseau). Les fonctions publiques (appelerGemini, chatGemini) ne changent pas :
// le nom est conservé pour compatibilité, mais elles interrogent la cascade.
//
// Clés via variables d'environnement Expo (embarquées côté client en prototype —
// passer par un proxy backend en production) :
//   EXPO_PUBLIC_GROQ_API_KEY     (gratuit : https://console.groq.com/keys)
//   EXPO_PUBLIC_GEMINI_API_KEY   (gratuit : https://aistudio.google.com/apikey)

const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const GROQ_MODELE = process.env.EXPO_PUBLIC_GROQ_MODEL || 'llama-3.3-70b-versatile';

// Modèles Gemini (principal + secours) tentés dans l'ordre.
const GEMINI_MODELES = Array.from(
  new Set(
    [
      ...(process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
      'gemini-2.0-flash',
      'gemini-flash-latest',
    ]
  )
);

export function iaDisponible(): boolean {
  return (
    (typeof GROQ_KEY === 'string' && GROQ_KEY.length > 0) ||
    (typeof GEMINI_KEY === 'string' && GEMINI_KEY.length > 0)
  );
}

interface OptionsAppel {
  /** Force une réponse JSON (application/json). */
  json?: boolean;
  temperature?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Représentation neutre d'une requête, traduite ensuite par chaque fournisseur.
interface Requete {
  system?: string;
  messages: { role: 'user' | 'assistant'; text: string }[];
  json: boolean;
  temperature: number;
}

type Resultat =
  | { ok: true; texte: string | null }
  | { ok: false; transitoire: boolean }; // transitoire => tenter le fournisseur suivant

// --- Fournisseur Groq (API OpenAI-compatible) --------------------------------

async function appelerGroq(req: Requete): Promise<Resultat> {
  if (!GROQ_KEY) return { ok: false, transitoire: true };
  const messages = [
    ...(req.system ? [{ role: 'system', content: req.system }] : []),
    ...req.messages.map((m) => ({ role: m.role, content: m.text })),
  ];
  const tentatives = 2;
  for (let i = 0; i < tentatives; i++) {
    try {
      const reponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODELE,
          messages,
          temperature: req.temperature,
          ...(req.json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (reponse.ok) {
        const data = await reponse.json();
        const texte: string | undefined = data?.choices?.[0]?.message?.content;
        return { ok: true, texte: typeof texte === 'string' ? texte : null };
      }
      if (reponse.status === 429 || reponse.status === 503) {
        if (i < tentatives - 1) {
          await sleep(700 * (i + 1));
          continue;
        }
        return { ok: false, transitoire: true };
      }
      return { ok: false, transitoire: false }; // 400/401/404 : clé/modèle KO → fournisseur suivant
    } catch {
      if (i < tentatives - 1) {
        await sleep(700 * (i + 1));
        continue;
      }
      return { ok: false, transitoire: true };
    }
  }
  return { ok: false, transitoire: true };
}

// --- Fournisseur Gemini (avec ses propres modèles de secours) ----------------

const GEMINI_ENDPOINT = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_KEY}`;

async function essayerGeminiModele(modele: string, req: Requete): Promise<Resultat> {
  const body = {
    ...(req.system ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
    contents: req.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
    generationConfig: {
      temperature: req.temperature,
      ...(req.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  const tentatives = 3;
  for (let i = 0; i < tentatives; i++) {
    try {
      const reponse = await fetch(GEMINI_ENDPOINT(modele), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (reponse.ok) {
        const data = await reponse.json();
        const texte: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return { ok: true, texte: typeof texte === 'string' ? texte : null };
      }
      if (reponse.status === 429 || reponse.status === 503) {
        if (i < tentatives - 1) {
          await sleep(700 * (i + 1));
          continue;
        }
        return { ok: false, transitoire: true };
      }
      return { ok: false, transitoire: reponse.status === 404 };
    } catch {
      if (i < tentatives - 1) {
        await sleep(700 * (i + 1));
        continue;
      }
      return { ok: false, transitoire: true };
    }
  }
  return { ok: false, transitoire: true };
}

async function appelerGeminiProvider(req: Requete): Promise<Resultat> {
  if (!GEMINI_KEY) return { ok: false, transitoire: true };
  for (const modele of GEMINI_MODELES) {
    const r = await essayerGeminiModele(modele, req);
    if (r.ok) return r;
    // transitoire ou définitif sur ce modèle → on tente le modèle suivant
  }
  return { ok: false, transitoire: true };
}

// --- Cascade -----------------------------------------------------------------

const FOURNISSEURS: ((req: Requete) => Promise<Resultat>)[] = [
  appelerGroq,
  appelerGeminiProvider,
];

// Interroge les fournisseurs dans l'ordre, en basculant au suivant tant qu'un
// résultat exploitable n'est pas obtenu. Renvoie le texte ou `null`.
async function executer(req: Requete): Promise<string | null> {
  if (!iaDisponible()) return null;
  for (const fournisseur of FOURNISSEURS) {
    const r = await fournisseur(req);
    if (r.ok) return r.texte;
    // échec (transitoire ou non) → fournisseur suivant
  }
  return null;
}

/**
 * Appel mono-prompt. Renvoie le texte généré, ou `null` si aucune IA n'est
 * disponible / en cas d'erreur. N'émet jamais d'exception.
 */
export async function appelerGemini(
  prompt: string,
  opts: OptionsAppel = {}
): Promise<string | null> {
  return executer({
    messages: [{ role: 'user', text: prompt }],
    json: !!opts.json,
    temperature: opts.temperature ?? 0.4,
  });
}

export interface TourChat {
  role: 'user' | 'model';
  text: string;
}

/**
 * Appel conversationnel multi-tours avec instruction système.
 * `history` doit commencer par un tour 'user'. Renvoie le texte (souvent du
 * JSON), ou `null` en cas d'indisponibilité / erreur.
 */
export async function chatGemini(
  systemPrompt: string,
  history: TourChat[],
  opts: OptionsAppel = {}
): Promise<string | null> {
  return executer({
    system: systemPrompt,
    messages: history.map((h) => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      text: h.text,
    })),
    json: !!opts.json,
    temperature: opts.temperature ?? 0.6,
  });
}
