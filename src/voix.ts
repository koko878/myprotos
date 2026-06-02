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

// Fusionne deux fragments de transcription en évitant les chevauchements.
// Ex. fusionner("je veux", "je veux créer") -> "je veux créer" (et non "je veuxje veux créer").
function fusionner(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  // b prolonge a (ou est identique) -> on garde b.
  if (nb.startsWith(na)) return b;
  // a contient déjà b -> on garde a.
  if (na.endsWith(nb) || na.includes(nb)) return a;
  // Chevauchement partiel : plus long suffixe de a == préfixe de b.
  const max = Math.min(a.length, b.length);
  for (let k = max; k > 0; k--) {
    if (na.slice(na.length - k) === nb.slice(0, k)) {
      return a + b.slice(k);
    }
  }
  // Aucun chevauchement : segments distincts -> on concatène avec une espace.
  return a + ' ' + b;
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
    // Reconstruit la transcription complète à chaque événement. Certains
    // navigateurs (Chrome Android) empilent des segments qui SE CHEVAUCHENT
    // (« je », « je veux », « je veux créer »…) -> une simple concaténation
    // produirait « jeje veuxje veux créer ». On fusionne donc intelligemment :
    // si le nouveau segment prolonge le texte courant (ou inversement), on garde
    // le plus complet au lieu d'additionner.
    let texte = '';
    let tousFinaux = true;
    for (let i = 0; i < e.results.length; i++) {
      const seg = String(e.results[i][0].transcript || '').trim();
      if (!e.results[i].isFinal) tousFinaux = false;
      if (!seg) continue;
      texte = fusionner(texte, seg);
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
