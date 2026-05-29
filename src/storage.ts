// Persistance locale des use cases (prototype sans backend).
// En production : remplacer par une API / base de données.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropositionExpert, StatutUseCase, UseCase } from './types';

const CLE = 'usecases_v1';

export async function chargerUseCases(): Promise<UseCase[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    if (!brut) return [];
    return JSON.parse(brut) as UseCase[];
  } catch {
    return [];
  }
}

export async function sauvegarderUseCases(liste: UseCase[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(liste));
  } catch {
    // silencieux en prototype
  }
}

export async function ajouterUseCase(uc: UseCase): Promise<UseCase[]> {
  const liste = await chargerUseCases();
  const nouvelle = [uc, ...liste];
  await sauvegarderUseCases(nouvelle);
  return nouvelle;
}

export async function trouverUseCase(id: string): Promise<UseCase | undefined> {
  const liste = await chargerUseCases();
  return liste.find((u) => u.id === id);
}

export async function mettreAJourStatut(
  id: string,
  statut: StatutUseCase
): Promise<UseCase[]> {
  const liste = await chargerUseCases();
  const nouvelle = liste.map((u) => (u.id === id ? { ...u, statut } : u));
  await sauvegarderUseCases(nouvelle);
  return nouvelle;
}

// Applique une transformation à un use case et persiste.
export async function modifierUseCase(
  id: string,
  maj: (uc: UseCase) => UseCase
): Promise<UseCase[]> {
  const liste = await chargerUseCases();
  const nouvelle = liste.map((u) => (u.id === id ? maj(u) : u));
  await sauvegarderUseCases(nouvelle);
  return nouvelle;
}

// Ajoute une proposition d'expert à un use case (côté offre).
export async function ajouterProposition(
  useCaseId: string,
  proposition: PropositionExpert
): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({
    ...u,
    propositions: [proposition, ...(u.propositions ?? [])],
  }));
}

// Accepte une proposition : la marque acceptée (refuse les autres) et fait
// passer le use case en "prototype_en_cours".
export async function accepterProposition(
  useCaseId: string,
  propositionId: string
): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({
    ...u,
    statut: 'prototype_en_cours',
    propositions: (u.propositions ?? []).map((p) => ({
      ...p,
      statut: p.id === propositionId ? 'acceptée' : 'refusée',
    })),
  }));
}
