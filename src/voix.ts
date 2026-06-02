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
    // En mode continu, e.results ACCUMULE tous les segments de la session.
    // On reconstruit donc la transcription COMPLÈTE à chaque événement (final +
    // interim) et on l'émet en entier — le consommateur remplace (ne concatène
    // pas), ce qui évite les doublons / triplements de mots.
    let texte = '';
    let tousFinaux = true;
    for (let i = 0; i < e.results.length; i++) {
      texte += e.results[i][0].transcript;
      if (!e.results[i].isFinal) tousFinaux = false;
    }
    onTexte(texte.trim(), tousFinaux);
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
