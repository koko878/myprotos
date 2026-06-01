// Banque d'idées : regroupement par domaine + détection de use cases similaires.
// 100% local, sans dépendance ni appel réseau : on compare les textes des use
// cases par similarité de Jaccard sur des tokens normalisés (titre + problème +
// objectif + domaine), avec un bonus si le domaine est identique.

import { UseCase } from './types';

// Mots vides français/anglais courants à ignorer (bruit pour la comparaison).
const STOP = new Set([
  'le','la','les','un','une','des','de','du','et','ou','a','à','au','aux','en',
  'pour','par','sur','dans','avec','sans','que','qui','quoi','dont','ce','cette',
  'ces','mon','ma','mes','son','sa','ses','nos','vos','leur','plus','moins','est',
  'sont','être','avoir','faire','the','a','an','of','to','and','or','for','in',
  'on','with','without','that','this','is','are','be','my','our','your','it',
  'se','ne','pas','je','tu','il','elle','nous','vous','ils','elles','d','l','s',
]);

function normaliser(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-z0-9\s]/g, ' ');
}

function tokens(uc: UseCase): Set<string> {
  const texte = [uc.titre, uc.probleme, uc.objectif, uc.domaine, uc.approcheSuggeree]
    .filter(Boolean)
    .join(' ');
  const mots = normaliser(texte)
    .split(/\s+/)
    .filter((m) => m.length > 2 && !STOP.has(m));
  return new Set(mots);
}

// Indice de Jaccard entre deux ensembles de tokens (0..1).
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Score de similarité (0..1) entre deux use cases : Jaccard texte + bonus domaine.
export function similarite(a: UseCase, b: UseCase): number {
  const base = jaccard(tokens(a), tokens(b));
  const memeDomaine =
    !!a.domaine && !!b.domaine &&
    normaliser(a.domaine).trim() === normaliser(b.domaine).trim();
  // Le domaine commun renforce la proximité sans écraser le signal textuel.
  const score = base * (memeDomaine ? 1.25 : 1) + (memeDomaine ? 0.05 : 0);
  return Math.min(score, 1);
}

export interface Similaire {
  uc: UseCase;
  score: number;
}

// Pour un use case donné, renvoie les autres triés par similarité décroissante,
// au-dessus d'un seuil (par défaut 0.18 = « quasi-similaire » sans trop de bruit).
export function trouverSimilaires(
  cible: UseCase,
  tous: UseCase[],
  seuil = 0.18
): Similaire[] {
  return tous
    .filter((u) => u.id !== cible.id)
    .map((u) => ({ uc: u, score: similarite(cible, u) }))
    .filter((s) => s.score >= seuil)
    .sort((x, y) => y.score - x.score);
}

export interface GroupeDomaine {
  domaine: string;
  items: UseCase[];
}

// Regroupe les use cases par domaine (clé normalisée, libellé d'origine conservé),
// triés par taille de groupe décroissante.
export function grouperParDomaine(tous: UseCase[]): GroupeDomaine[] {
  const map = new Map<string, { libelle: string; items: UseCase[] }>();
  for (const u of tous) {
    const libelle = (u.domaine || 'Non classé').trim() || 'Non classé';
    const cle = normaliser(libelle).trim() || 'non classe';
    const g = map.get(cle);
    if (g) g.items.push(u);
    else map.set(cle, { libelle, items: [u] });
  }
  return Array.from(map.values())
    .map((g) => ({ domaine: g.libelle, items: g.items }))
    .sort((a, b) => b.items.length - a.items.length || a.domaine.localeCompare(b.domaine));
}

// Détecte les paires quasi-similaires dans toute la banque (pour signaler les
// doublons d'idées). Seuil plus élevé (0.4) = vraiment proches.
export interface PaireSimilaire {
  a: UseCase;
  b: UseCase;
  score: number;
}

export function pairesSimilaires(tous: UseCase[], seuil = 0.4): PaireSimilaire[] {
  const paires: PaireSimilaire[] = [];
  for (let i = 0; i < tous.length; i++) {
    for (let j = i + 1; j < tous.length; j++) {
      const score = similarite(tous[i], tous[j]);
      if (score >= seuil) paires.push({ a: tous[i], b: tous[j], score });
    }
  }
  return paires.sort((x, y) => y.score - x.score);
}
