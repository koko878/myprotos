// Adaptateur LLM multi-fournisseurs avec cascade automatique.
//
// Ordre d'essai : Groq (gros quota gratuit + rapide) → Gemini (filet de secours).
// Chaque appel bascule sur le fournisseur suivant en cas de panne/quota (429/503/
// réseau). Les fonctions publiques (appelerGemini, chatGemini) ne changent pas :
// le nom est conservé pour compatibilité, mais elles interrogent la cascade.
//
// DEUX MODES d'accès aux fournisseurs :
//   1. PROXY (recommandé en prod) — si EXPO_PUBLIC_LLM_PROXY_URL est défini, les
//      requêtes passent par un Worker qui détient les clés en SECRET. Aucune clé
//      n'est alors embarquée dans le bundle public (voir proxy/README.md).
//   2. DIRECT (dev/proto) — sinon, on appelle les API avec les clés locales
//      EXPO_PUBLIC_GROQ_API_KEY / EXPO_PUBLIC_GEMINI_API_KEY (⚠️ clés exposées
//      côté client : à réserver au développement).

const PROXY_URL = (process.env.EXPO_PUBLIC_LLM_PROXY_URL || '').replace(/\/$/, '');
const UTILISE_PROXY = PROXY_URL.length > 0;

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

// Disponibilité de chaque fournisseur selon le mode.
const groqDispo = UTILISE_PROXY || (typeof GROQ_KEY === 'string' && GROQ_KEY.length > 0);
const geminiDispo = UTILISE_PROXY || (typeof GEMINI_KEY === 'string' && GEMINI_KEY.length > 0);

export function iaDisponible(): boolean {
  return groqDispo || geminiDispo;
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

// POST JSON générique avec réessais sur erreurs transitoires (429/503/réseau).
async function postJson(
  url: string,
  body: object,
  headers: Record<string, string>,
  tentatives: number
): Promise<{ status: number; data: any } | null> {
  for (let i = 0; i < tentatives; i++) {
    try {
      const reponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
      if (reponse.ok) return { status: reponse.status, data: await reponse.json() };
      if (reponse.status === 429 || reponse.status === 503) {
        if (i < tentatives - 1) {
          await sleep(700 * (i + 1));
          continue;
        }
        return { status: reponse.status, data: null };
      }
      return { status: reponse.status, data: null };
    } catch {
      if (i < tentatives - 1) {
        await sleep(700 * (i + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

// --- Fournisseur Groq (API OpenAI-compatible, directe ou via proxy) ----------

async function appelerGroq(req: Requete): Promise<Resultat> {
  if (!groqDispo) return { ok: false, transitoire: true };
  const corps = {
    model: GROQ_MODELE,
    messages: [
      ...(req.system ? [{ role: 'system', content: req.system }] : []),
      ...req.messages.map((m) => ({ role: m.role, content: m.text })),
    ],
    temperature: req.temperature,
    ...(req.json ? { response_format: { type: 'json_object' } } : {}),
  };

  const url = UTILISE_PROXY ? `${PROXY_URL}/groq` : 'https://api.groq.com/openai/v1/chat/completions';
  const headers: Record<string, string> = UTILISE_PROXY ? {} : { Authorization: `Bearer ${GROQ_KEY}` };

  const res = await postJson(url, corps, headers, 2);
  if (!res) return { ok: false, transitoire: true };
  if (res.data) {
    const texte: string | undefined = res.data?.choices?.[0]?.message?.content;
    return { ok: true, texte: typeof texte === 'string' ? texte : null };
  }
  // pas de données : transitoire si surcharge, sinon on bascule quand même
  return { ok: false, transitoire: res.status === 429 || res.status === 503 };
}

// --- Fournisseur Gemini (avec ses propres modèles de secours) ----------------

async function essayerGeminiModele(modele: string, req: Requete): Promise<Resultat> {
  const corps = {
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

  const url = UTILISE_PROXY
    ? `${PROXY_URL}/gemini?model=${encodeURIComponent(modele)}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${GEMINI_KEY}`;

  const res = await postJson(url, corps, {}, 3);
  if (!res) return { ok: false, transitoire: true };
  if (res.data) {
    const texte: string | undefined = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return { ok: true, texte: typeof texte === 'string' ? texte : null };
  }
  return { ok: false, transitoire: res.status === 429 || res.status === 503 || res.status === 404 };
}

async function appelerGeminiProvider(req: Requete): Promise<Resultat> {
  if (!geminiDispo) return { ok: false, transitoire: true };
  for (const modele of GEMINI_MODELES) {
    const r = await essayerGeminiModele(modele, req);
    if (r.ok) return r;
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
