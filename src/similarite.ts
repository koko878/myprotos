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

// --- Taxonomie canonique des secteurs ----------------------------------------
// L'IA produit des libellés de domaine en texte libre (FR/EN, formulations
// variées) : "Beauty & Wellness", "Esthétique et coiffure", "institut de
// beauté"… désignent le MÊME secteur. On rattache chaque idée à un secteur
// canonique par mots-clés (sur le domaine + titre + problème), pour un
// regroupement fiable de la banque.
interface SecteurCanon {
  libelle: string;
  motsCles: string[];
}

const TAXONOMIE: SecteurCanon[] = [
  { libelle: 'Beauté & bien-être', motsCles: ['beaute', 'beauty', 'wellness', 'esthetique', 'coiffure', 'institut', 'spa', 'cosmetique', 'salon', 'massage', 'soin', 'bien etre', 'maquillage', 'ongle', 'barbier'] },
  { libelle: 'Santé & médical', motsCles: ['sante', 'health', 'medical', 'medecin', 'hopital', 'clinique', 'patient', 'pharmacie', 'soin', 'medicament', 'cabinet', 'dentaire', 'therapie', 'diagnostic'] },
  { libelle: 'Finance & banque', motsCles: ['finance', 'banque', 'bank', 'paiement', 'payment', 'credit', 'pret', 'comptable', 'comptabilite', 'facture', 'invoice', 'budget', 'tresorerie', 'fintech', 'investissement'] },
  { libelle: 'Assurance', motsCles: ['assurance', 'insurance', 'sinistre', 'police', 'mutuelle'] },
  { libelle: 'Commerce & retail', motsCles: ['commerce', 'retail', 'boutique', 'magasin', 'vente', 'ecommerce', 'e commerce', 'shop', 'produit', 'catalogue', 'panier', 'marchand', 'distribution', 'caisse'] },
  { libelle: 'Marketing & vente', motsCles: ['marketing', 'commerciale', 'commercial', 'publicite', 'pub', 'campagne', 'crm', 'lead', 'prospection', 'fidelisation', 'chiffre d affaires', 'acquisition', 'churn', 'client'] },
  { libelle: 'Restauration & hôtellerie', motsCles: ['restaurant', 'restauration', 'hotel', 'hotellerie', 'tourisme', 'cafe', 'menu', 'reservation', 'food', 'cuisine', 'traiteur'] },
  { libelle: 'Immobilier & décoration', motsCles: ['immobilier', 'real estate', 'decoration', 'design interieur', 'interieur', 'amenagement', 'mobilier', 'logement', 'location', 'bien immobilier', 'architecture'] },
  { libelle: 'Industrie & logistique', motsCles: ['industrie', 'usine', 'production', 'logistique', 'transport', 'supply', 'stock', 'entrepot', 'livraison', 'fabrication', 'maintenance', 'chaine'] },
  { libelle: 'Éducation & formation', motsCles: ['education', 'formation', 'ecole', 'cours', 'apprentissage', 'etudiant', 'eleve', 'enseignement', 'elearning', 'e learning', 'universite', 'tutorat'] },
  { libelle: 'Agriculture', motsCles: ['agriculture', 'agricole', 'ferme', 'culture', 'elevage', 'recolte', 'agro'] },
  { libelle: 'Énergie & environnement', motsCles: ['energie', 'energy', 'environnement', 'ecologie', 'solaire', 'electricite', 'carbone', 'recyclage', 'dechet'] },
  { libelle: 'RH & recrutement', motsCles: ['rh', 'ressources humaines', 'recrutement', 'recruitment', 'talent', 'paie', 'employe', 'collaborateur', 'candidat'] },
  { libelle: 'Juridique', motsCles: ['juridique', 'legal', 'droit', 'avocat', 'contrat', 'conformite', 'notaire'] },
  { libelle: 'Gestion documentaire', motsCles: ['document', 'archivage', 'gestion documentaire', 'fichier', 'numerisation', 'classement', 'dossier'] },
  { libelle: 'Tech & logiciel', motsCles: ['logiciel', 'software', 'application', 'plateforme', 'saas', 'developpement', 'informatique', 'data', 'donnees', 'ia', 'intelligence artificielle'] },
];

// Rattache une idée à son secteur canonique (ou son domaine d'origine si aucun
// mot-clé ne ressort). On pondère le domaine plus fort que le reste du texte.
export function secteurCanonique(uc: UseCase): string {
  const domaine = normaliser(uc.domaine);
  const reste = normaliser([uc.titre, uc.probleme, uc.objectif].filter(Boolean).join(' '));
  let meilleur: { libelle: string; score: number } | null = null;
  for (const sec of TAXONOMIE) {
    let score = 0;
    for (const mc of sec.motsCles) {
      if (domaine.includes(mc)) score += 3; // le domaine prime
      else if (reste.includes(mc)) score += 1;
    }
    if (score > 0 && (!meilleur || score > meilleur.score)) {
      meilleur = { libelle: sec.libelle, score };
    }
  }
  if (meilleur) return meilleur.libelle;
  // Aucun mot-clé : on garde le libellé d'origine (proprement formaté).
  return (uc.domaine || 'Non classé').trim() || 'Non classé';
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

// Score de similarité (0..1) entre deux use cases : Jaccard texte + bonus si
// même secteur canonique (ex. "Beauty & Wellness" ≈ "Esthétique et coiffure").
export function similarite(a: UseCase, b: UseCase): number {
  const base = jaccard(tokens(a), tokens(b));
  const memeSecteur = secteurCanonique(a) === secteurCanonique(b);
  const score = base * (memeSecteur ? 1.3 : 1) + (memeSecteur ? 0.12 : 0);
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

// Regroupe les use cases par SECTEUR CANONIQUE (libellés variés de l'IA ramenés
// à une taxonomie fixe), triés par taille de groupe décroissante.
export function grouperParDomaine(tous: UseCase[]): GroupeDomaine[] {
  const map = new Map<string, UseCase[]>();
  for (const u of tous) {
    const secteur = secteurCanonique(u);
    const g = map.get(secteur);
    if (g) g.push(u);
    else map.set(secteur, [u]);
  }
  return Array.from(map.entries())
    .map(([domaine, items]) => ({ domaine, items }))
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
