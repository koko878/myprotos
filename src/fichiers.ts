// Utilitaires fichiers 100% navigateur (web) : sélection de pièces jointes,
// construction d'un ZIP (prompt + pièces) et téléchargement. Aucun backend.
import { Platform } from 'react-native';
import { PieceJointe, UseCase } from './types';

let seq = 0;
const pid = () => `pj_${Date.now().toString(36)}_${seq++}`;

// Ouvre le sélecteur de fichiers et renvoie les pièces lues en data URL.
// Web : input DOM. Natif (APK) : expo-document-picker.
export async function choisirFichiers(accept = '*/*'): Promise<PieceJointe[]> {
  if (Platform.OS !== 'web') return choisirFichiersNatif();
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve([]);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    let resolu = false;
    const nettoyer = () => {
      try { document.body.removeChild(input); } catch { /* déjà retiré */ }
    };
    const terminer = (pieces: PieceJointe[]) => {
      if (resolu) return;
      resolu = true;
      nettoyer();
      resolve(pieces);
    };
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      const pieces: PieceJointe[] = [];
      for (const f of files) {
        const dataUrl = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res(String(reader.result || ''));
          reader.onerror = () => res('');
          reader.readAsDataURL(f);
        });
        if (dataUrl) {
          pieces.push({
            id: pid(),
            nom: f.name,
            type: f.type || 'application/octet-stream',
            taille: f.size,
            dataUrl,
            creeLe: Date.now(),
          });
        }
      }
      terminer(pieces);
    };
    // Annulation : l'événement 'cancel' (navigateurs modernes) OU un repli au
    // retour de focus garantissent qu'on résout TOUJOURS (promesse jamais
    // suspendue, input jamais laissé dans le DOM).
    input.oncancel = () => terminer([]);
    const surFocus = () => {
      window.removeEventListener('focus', surFocus);
      // Au retour de focus : si AUCUN fichier choisi, c'est une annulation.
      // Si des fichiers sont présents, on laisse onchange finir (lecture async).
      setTimeout(() => {
        if (!input.files || input.files.length === 0) terminer([]);
      }, 300);
    };
    window.addEventListener('focus', surFocus);
    document.body.appendChild(input);
    input.click();
  });
}

// Sélection de pièces jointes en natif (Android/iOS) via DocumentPicker.
async function choisirFichiersNatif(): Promise<PieceJointe[]> {
  try {
    const DocumentPicker = await import('expo-document-picker');
    const FileSystem = await import('expo-file-system');
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (res.canceled || !res.assets) return [];
    const pieces: PieceJointe[] = [];
    for (const a of res.assets) {
      const b64 = await FileSystem.readAsStringAsync(a.uri, { encoding: 'base64' as any });
      const mime = a.mimeType || 'application/octet-stream';
      pieces.push({
        id: pid(),
        nom: a.name || 'fichier',
        type: mime,
        taille: a.size || 0,
        dataUrl: `data:${mime};base64,${b64}`,
        creeLe: Date.now(),
      });
    }
    return pieces;
  } catch {
    return [];
  }
}

// Lit UN fichier texte (ex: .html). Web : input DOM. Natif : DocumentPicker.
export async function lireFichierTexte(
  accept = '.html,text/html'
): Promise<{ nom: string; contenu: string } | null> {
  if (Platform.OS !== 'web') return lireFichierTexteNatif();
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    // Sur mobile web, l'input doit être DANS le DOM pour que la sélection marche.
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    let resolu = false;
    const nettoyer = () => {
      try { document.body.removeChild(input); } catch { /* déjà retiré */ }
    };
    const terminer = (val: { nom: string; contenu: string } | null) => {
      if (resolu) return;
      resolu = true;
      nettoyer();
      resolve(val);
    };
    input.onchange = () => {
      const f = (input.files || [])[0];
      if (!f) {
        terminer(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => terminer({ nom: f.name, contenu: String(reader.result || '') });
      reader.onerror = () => terminer(null);
      reader.readAsText(f);
    };
    // Annulation : 'cancel' moderne + repli au retour de focus (promesse jamais
    // suspendue, input jamais laissé dans le DOM).
    input.oncancel = () => terminer(null);
    const surFocus = () => {
      window.removeEventListener('focus', surFocus);
      // Au retour de focus : annulation seulement si aucun fichier choisi.
      setTimeout(() => {
        if (!input.files || input.files.length === 0) terminer(null);
      }, 300);
    };
    window.addEventListener('focus', surFocus);
    document.body.appendChild(input);
    input.click();
  });
}

// Lecture d'un fichier texte en natif (Android/iOS).
async function lireFichierTexteNatif(): Promise<{ nom: string; contenu: string } | null> {
  try {
    const DocumentPicker = await import('expo-document-picker');
    const FileSystem = await import('expo-file-system');
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/html', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    const contenu = await FileSystem.readAsStringAsync(a.uri, { encoding: 'utf8' as any });
    return { nom: a.name || 'fichier.html', contenu };
  } catch {
    return null;
  }
}

export function tailleLisible(octets: number): string {
  if (octets < 1024) return octets + ' o';
  if (octets < 1024 * 1024) return (octets / 1024).toFixed(0) + ' Ko';
  return (octets / 1024 / 1024).toFixed(1) + ' Mo';
}

// Construit le prompt complet (brief + remarques) à passer à un agent de code.
export function construirePromptComplet(uc: UseCase): string {
  const L: string[] = [];
  L.push('# Brief de prototype — ' + uc.titre);
  L.push('');
  L.push('Tu es un designer-développeur front-end de très haut niveau ET un consultant produit senior.');
  L.push('Construis un PROTOTYPE web de démonstration **bluffant** (un seul index.html auto-porté, CDN');
  L.push('autorisés pour polices/icônes/libs UI, données d\'exemple en dur, interactions réelles). Évite');
  L.push('l\'esthétique IA générique ; vise un rendu niveau studio primé, responsive et soigné.');
  L.push('');
  L.push('POSTURE D\'EXPERT : le client sait rarement exactement ce qu\'il veut, ou n\'en a qu\'une vision');
  L.push('limitée. Ne te limite PAS à sa demande littérale : enrichis-la. Propose des fonctionnalités,');
  L.push('écrans ou indicateurs à forte valeur auxquels il n\'a pas pensé mais qui servent clairement son');
  L.push('objectif métier, anticipe les besoins implicites du secteur, et fais-lui découvrir des');
  L.push('possibilités qu\'il n\'imaginait pas. Reste réaliste : chaque ajout doit avoir un sens métier');
  L.push('évident (pas de gadget).');
  L.push('');
  L.push('## Contexte métier');
  L.push('- Domaine : ' + uc.domaine);
  L.push('- Problème : ' + uc.probleme);
  L.push('- Objectif : ' + uc.objectif);
  L.push('- Utilisateurs cibles : ' + uc.utilisateurs);
  L.push('- Approche : ' + uc.approcheSuggeree);
  if (uc.kpis?.length) L.push('- KPIs à mettre en avant : ' + uc.kpis.join(', '));
  if (uc.langues?.length) L.push('- Langues de l’interface : ' + uc.langues.join(', '));
  if (uc.donnees) L.push('- Données disponibles : ' + uc.donnees);
  if (uc.contraintes) L.push('- Contraintes : ' + uc.contraintes);
  if (uc.ventilationPrix) L.push('- Prix projet estimé : ' + uc.ventilationPrix.totalEur.toLocaleString('fr-FR') + ' €');
  if (uc.coutRun) {
    L.push('- Coût de RUN estimé : ' + uc.coutRun.cloudMensuelEur.toLocaleString('fr-FR') + ' €/mois (cloud) ou ' + uc.coutRun.onPremiseMensuelEur.toLocaleString('fr-FR') + ' €/mois (on-premise)');
  }
  if (uc.spec?.resume) L.push('- Résumé du prototype : ' + uc.spec.resume);
  if (uc.spec?.fonctionnalites?.length) {
    L.push('- Fonctionnalités à démontrer : ' + uc.spec.fonctionnalites.join(' ; '));
  }

  const remarques = (uc.remarques ?? []).map((r) => r.texte);
  if (remarques.length) {
    L.push('');
    L.push('## Remarques du client à intégrer EN PRIORITÉ (nouvelle version)');
    remarques.forEach((r, i) => L.push(`${i + 1}. ${r}`));
  }

  const pj = uc.piecesJointes ?? [];
  if (pj.length) {
    L.push('');
    L.push('## Pièces jointes fournies (dans le dossier /pieces-jointes du ZIP)');
    pj.forEach((p) => L.push(`- ${p.nom} (${p.type})`));
    L.push('');
    L.push('Respecte la charte graphique / le logo fournis (couleurs, typographie, ton).');
  }

  L.push('');
  L.push('## Valeur ajoutée attendue (expertise)');
  L.push('Au-delà du strict périmètre ci-dessus, intègre 2 à 4 éléments à forte valeur que le client');
  L.push('n\'a pas demandés mais qui renforcent son objectif (ex. tableau de bord, suggestions');
  L.push('intelligentes, automatisations, indicateurs clés, parcours simplifié…). Mets-les en évidence');
  L.push('pour qu\'il perçoive immédiatement la valeur supplémentaire.');
  L.push('');
  L.push('## Livrable');
  L.push('Un fichier index.html complet, prêt à ouvrir. Aucune question : décide et produis.');
  return L.join('\n');
}

function slugProjet(uc: UseCase): string {
  return (
    uc.titre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'projet'
  );
}

// Déclenche le téléchargement d'un fichier depuis une URL (blob ou data URL).
function declencherTelechargement(url: string, nom: string, revoke: boolean) {
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (revoke) setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Télécharge le dossier projet SANS dépendance (JSZip échoue sur web faute de
 * polyfill setImmediate). On télécharge :
 *  - PROMPT.md (brief complet à passer à l'agent de code)
 *  - chaque pièce jointe en fichier réel.
 * Renvoie le nombre de fichiers téléchargés.
 */
export function telechargerDossierProjet(uc: UseCase): number {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return 0;
  let n = 0;
  const slug = slugProjet(uc);

  // 1) Le prompt (Markdown)
  const blob = new Blob([construirePromptComplet(uc)], { type: 'text/markdown' });
  declencherTelechargement(URL.createObjectURL(blob), `PROMPT-${slug}.md`, true);
  n++;

  // 2) Les pièces jointes (data URL -> téléchargement direct, espacé pour éviter
  //    que le navigateur ne bloque les téléchargements multiples).
  const pj = uc.piecesJointes ?? [];
  pj.forEach((p, i) => {
    setTimeout(() => declencherTelechargement(p.dataUrl, p.nom, false), 400 * (i + 1));
    n++;
  });

  return n;
}
