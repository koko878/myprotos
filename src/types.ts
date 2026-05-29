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
