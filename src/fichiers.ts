// Utilitaires fichiers 100% navigateur (web) : sélection de pièces jointes,
// construction d'un ZIP (prompt + pièces) et téléchargement. Aucun backend.
import { Platform } from 'react-native';
import { PieceJointe, UseCase } from './types';

let seq = 0;
const pid = () => `pj_${Date.now().toString(36)}_${seq++}`;

// Ouvre le sélecteur de fichiers (web) et renvoie les pièces lues en data URL.
export function choisirFichiers(accept = '*/*'): Promise<PieceJointe[]> {
  return new Promise((resolve) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      resolve([]);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
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
      resolve(pieces);
    };
    // Si l'utilisateur annule, onchange ne se déclenche pas : on ne bloque pas.
    input.click();
  });
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
  L.push('Tu es un designer-développeur front-end de très haut niveau. Construis un PROTOTYPE web');
  L.push('de démonstration **bluffant** (un seul index.html auto-porté, CDN autorisés pour polices/');
  L.push('icônes/libs UI, données d\'exemple en dur, interactions réelles). Évite l\'esthétique IA');
  L.push('générique ; vise un rendu niveau studio primé, responsive et soigné.');
  L.push('');
  L.push('## Contexte métier');
  L.push('- Domaine : ' + uc.domaine);
  L.push('- Problème : ' + uc.probleme);
  L.push('- Objectif : ' + uc.objectif);
  L.push('- Utilisateurs cibles : ' + uc.utilisateurs);
  L.push('- Approche : ' + uc.approcheSuggeree);
  if (uc.kpis?.length) L.push('- KPIs à mettre en avant : ' + uc.kpis.join(', '));
  if (uc.donnees) L.push('- Données disponibles : ' + uc.donnees);
  if (uc.contraintes) L.push('- Contraintes : ' + uc.contraintes);
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
