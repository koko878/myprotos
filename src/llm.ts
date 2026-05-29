// Adaptateur LLM — Google Gemini (palier gratuit).
//
// Clé fournie via variable d'environnement Expo `EXPO_PUBLIC_GEMINI_API_KEY`
// (obtenable gratuitement sur https://aistudio.google.com/apikey).
//
// ⚠️ Prototype : la clé EXPO_PUBLIC_* est embarquée côté client. En production,
// passer par un backend proxy pour ne JAMAIS exposer la clé dans l'app mobile.

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Chaîne de modèles : on essaie le principal, puis on bascule sur des modèles
// de secours si le premier est saturé (503) ou indisponible (404). Le palier
// gratuit de Gemini étant régulièrement surchargé, ce repli réduit fortement
// les échecs visibles par l'utilisateur.
const MODELES = Array.from(
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
  return typeof GEMINI_KEY === 'string' && GEMINI_KEY.length > 0;
}

interface OptionsAppel {
  /** Force une réponse JSON (application/json). */
  json?: boolean;
  temperature?: number;
}

const ENDPOINT = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_KEY}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Resultat =
  | { ok: true; texte: string | null }
  | { ok: false; transitoire: boolean };

// Un essai sur un modèle donné, avec réessais sur erreurs transitoires
// (429 = débit, 503 = surcharge). Renvoie `transitoire:false` si l'échec est
// définitif pour ce modèle (ex: 404 modèle inconnu) afin de passer au suivant.
async function essayerModele(modele: string, body: object): Promise<Resultat> {
  const tentatives = 3;
  for (let i = 0; i < tentatives; i++) {
    try {
      const reponse = await fetch(ENDPOINT(modele), {
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
          await sleep(700 * (i + 1)); // backoff: 0.7s, 1.4s
          continue;
        }
        return { ok: false, transitoire: true }; // surcharge persistante → modèle suivant
      }
      // 400/404/403... : inutile de réessayer ce modèle.
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

// POST vers Gemini avec bascule automatique sur les modèles de secours.
// Renvoie le texte généré ou `null`. N'émet jamais d'exception.
async function postGemini(body: object): Promise<string | null> {
  for (const modele of MODELES) {
    const r = await essayerModele(modele, body);
    if (r.ok) return r.texte;
    if (!r.transitoire) continue; // échec définitif pour ce modèle → suivant
    // échec transitoire (surcharge) → on tente le modèle suivant aussi
  }
  return null;
}

/**
 * Appel mono-prompt. Renvoie le texte généré, ou `null` si l'IA n'est pas
 * disponible / en cas d'erreur. N'émet jamais d'exception.
 */
export async function appelerGemini(
  prompt: string,
  opts: OptionsAppel = {}
): Promise<string | null> {
  if (!iaDisponible()) return null;
  return postGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
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
  if (!iaDisponible()) return null;
  return postGemini({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    generationConfig: {
      temperature: opts.temperature ?? 0.6,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  });
}
