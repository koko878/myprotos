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

/**
 * Appelle Gemini et renvoie le texte généré, ou `null` si l'IA n'est pas
 * disponible / en cas d'erreur (le code appelant doit alors retomber sur le
 * moteur local). N'émet jamais d'exception vers l'appelant.
 */
export async function appelerGemini(
  prompt: string,
  opts: OptionsAppel = {}
): Promise<string | null> {
  if (!iaDisponible()) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:generateContent?key=${GEMINI_KEY}`;

  try {
    const reponse = await fetch(url, {
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
    const texte: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof texte === 'string' ? texte : null;
  } catch {
    return null;
  }
}
