// Persistance locale des use cases (prototype sans backend).
// En production : remplacer par une API / base de données.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatutUseCase, UseCase } from './types';

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
