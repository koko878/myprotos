// Ouvre un prototype HTML auto-porté dans un nouvel onglet (web), en plein écran.
// Utilise une blob URL (plus fiable que document.write, autorisé par les
// navigateurs mobiles tant que l'appel vient d'un geste utilisateur).
import { Platform } from 'react-native';

export function ouvrirHtmlNouvelOnglet(html: string): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    // Libère l'URL après un délai (le temps que l'onglet l'ait chargée).
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (!w) {
      // Popup bloquée : repli document.write dans la même tentative.
      const w2 = window.open('', '_blank');
      if (w2) {
        w2.document.open();
        w2.document.write(html);
        w2.document.close();
        return true;
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
