// Copie presse-papiers cross-plateforme sans dépendance native.
// Sur web (cible déployée) : navigator.clipboard, avec repli textarea+execCommand.
// Sur natif : no-op silencieux (le prototype cible le web).
import { Platform } from 'react-native';

export async function copier(texte: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texte);
        return true;
      }
      // Repli pour contextes non sécurisés / anciens navigateurs.
      const ta = document.createElement('textarea');
      ta.value = texte;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  } catch {
    // ignore
  }
  return false;
}
