// Adaptateur LLM — Google Gemini (palier gratuit).
//
// Clé fournie via variable d'environnement Expo `EXPO_PUBLIC_GEMINI_API_KEY`
// (obtenable gratuitement sur https://aistudio.google.com/apikey).
//
// ⚠️ Prototype : la clé EXPO_PUBLIC_* est embarquée côté client. En production,
// passer par un backend proxy pour ne JAMAIS exposer la clé dans l'app mobile.

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODELE = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';

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

/**
 * Appel mono-prompt. Renvoie le texte généré, ou `null` si l'IA n'est pas
 * disponible / en cas d'erreur. N'émet jamais d'exception.
 */
export async function appelerGemini(
  prompt: string,
  opts: OptionsAppel = {}
): Promise<string | null> {
  if (!iaDisponible()) return null;
  try {
    const reponse = await fetch(ENDPOINT(MODELE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.4,
          ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });
    if (!reponse.ok) return null;
    const data = await reponse.json();
    const texte: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof texte === 'string' ? texte : null;
  } catch {
    return null;
  }
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
  try {
    const reponse = await fetch(ENDPOINT(MODELE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
        generationConfig: {
          temperature: opts.temperature ?? 0.6,
          ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });
    if (!reponse.ok) return null;
    const data = await reponse.json();
    const texte: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof texte === 'string' ? texte : null;
  } catch {
    return null;
  }
}
