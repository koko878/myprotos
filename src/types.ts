// Modèles de données du prototype "marketplace tech/data/IA".
// Côté adressé dans ce MVP : le DEMANDEUR + le cadrage assisté par IA.

export type Complexite = 'Faible' | 'Moyenne' | 'Élevée';

export type StatutUseCase =
  | 'brouillon' // en cours de cadrage
  | 'publié' // listé pour les experts
  | 'prototype_en_cours'
  | 'prototype_validé'
  | 'livré';

/**
 * Estimation du retour sur investissement, produite par l'IA à partir des
 * volumes et coûts actuels collectés pendant le cadrage. Permet au demandeur
 * (et aux experts) de juger la rentabilité avant d'investir.
 */
export interface EstimationROI {
  hypotheses: string; // base de calcul (volumes, coûts actuels) reformulée
  gainAnnuelEur: number; // gain / économie estimé par an (€)
  investissementEur: number; // coût projet estimé (€, milieu de fourchette)
  retourMois: number; // délai de retour sur investissement (mois)
  roiAn1Pct: number; // ROI sur 12 mois en %
  detail: string; // explication courte du raisonnement
}

/**
 * Spécification technique du prototype, suffisamment précise pour qu'un
 * agent de code (Claude Code) produise un prototype SANS poser de question.
 */
export interface SpecPrototype {
  resume: string; // une phrase : ce que fait le prototype
  stack: string[]; // technologies recommandées
  fonctionnalites: string[]; // fonctionnalités du prototype (périmètre POC)
  donneesEntree: string; // format / source des données d'entrée
  sortieAttendue: string; // ce que produit le prototype (livrable observable)
  criteresAcceptation: string[]; // conditions de réussite vérifiables
  promptClaudeCode: string; // prompt autonome prêt à coller dans Claude Code
}

export type StatutProposition = 'proposée' | 'acceptée' | 'refusée';

/** Proposition d'un expert (anonyme) pour réaliser le prototype d'un use case. */
export interface PropositionExpert {
  id: string;
  expert: string; // pseudo anonymisé, ex. "Expert #F88"
  specialite: string;
  note: number; // 0-5
  prixEur: number; // prix proposé pour le prototype
  delaiJours: number; // délai annoncé
  message: string; // pitch de l'expert
  statut: StatutProposition;
  creeLe: number;
}

/**
 * Use case structuré, produit à l'issue du cadrage assisté par IA.
 * C'est l'objet central de la plateforme : ce que le demandeur publie
 * et ce sur quoi les experts (anonymes) viendront se positionner.
 */
export interface UseCase {
  id: string;
  titre: string;
  domaine: string; // ex. "Marketing", "Industrie", "Finance"
  probleme: string; // douleur métier
  objectif: string; // objectif business mesurable
  kpis: string[]; // indicateurs de succès
  donnees: string; // données disponibles
  utilisateurs: string; // utilisateurs cibles de la solution
  contraintes: string; // délai / budget / conformité
  approcheSuggeree: string; // piste technique proposée par l'IA
  complexite: Complexite;
  scoreCadrage: number; // 0-100 : maturité du cadrage
  budgetEstime: string; // fourchette estimée
  roi?: EstimationROI; // estimation du retour sur investissement (IA)
  spec?: SpecPrototype; // spécification + prompt prêt pour Claude Code (IA)
  propositions?: PropositionExpert[]; // offres reçues des experts
  statut: StatutUseCase;
  creeLe: number; // timestamp
}

export type Role = 'assistant' | 'user';

export interface Message {
  id: string;
  role: Role;
  texte: string;
  // Suggestions cliquables proposées par l'assistant pour accélérer la saisie.
  suggestions?: string[];
}
