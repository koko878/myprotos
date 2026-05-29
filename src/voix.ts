// Dictée vocale 100% navigateur via la Web Speech API (web only, sans backend).
// Permet à l'utilisateur de PARLER au lieu de taper pendant le cadrage.
import { Platform } from 'react-native';

export function dicteeDisponible(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export interface SessionDictee {
  stop: () => void;
}

/**
 * Démarre la reconnaissance vocale (français). `onTexte` reçoit le texte
 * reconnu au fil de l'eau (résultats intermédiaires + finaux). `onFin` est
 * appelé à l'arrêt. Renvoie un handle pour stopper, ou `null` si indisponible.
 */
export function demarrerDictee(
  onTexte: (texte: string, final: boolean) => void,
  onFin: () => void
): SessionDictee | null {
  if (!dicteeDisponible()) return null;
  const w = window as any;
  const Reco = w.SpeechRecognition || w.webkitSpeechRecognition;
  const reco = new Reco();
  reco.lang = 'fr-FR';
  reco.continuous = true;
  reco.interimResults = true;

  reco.onresult = (e: any) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }
    if (final) onTexte(final, true);
    else if (interim) onTexte(interim, false);
  };
  reco.onerror = () => onFin();
  reco.onend = () => onFin();

  try {
    reco.start();
  } catch {
    return null;
  }
  return { stop: () => { try { reco.stop(); } catch { /* ignore */ } } };
}
