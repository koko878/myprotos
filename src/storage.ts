// Persistance locale des use cases (prototype sans backend).
// En production : remplacer par une API / base de données.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CadrageTechnique, RemarqueClient, StatutUseCase, UseCase } from './types';

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

// Enregistre le prototype HTML généré (côté admin) et passe le use case en
// "prototype_genere" pour validation par le client. Incrémente la version
// (utile pour les régénérations après remarques du client).
export async function enregistrerPrototype(
  useCaseId: string,
  prototypeHtml: string
): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({
    ...u,
    prototypeHtml,
    prototypeGenereLe: Date.now(),
    prototypeVersion: (u.prototypeVersion ?? 0) + 1,
    statut: 'prototype_genere',
  }));
}

// Le client challenge le prototype : ajoute une ou plusieurs remarques/besoins
// et renvoie le projet en révision côté admin.
export async function ajouterRemarques(
  useCaseId: string,
  textes: string[]
): Promise<UseCase[]> {
  const propres = textes.map((t) => t.trim()).filter(Boolean);
  if (propres.length === 0) return modifierUseCase(useCaseId, (u) => u);
  return modifierUseCase(useCaseId, (u) => {
    const base = Date.now();
    const nouvelles: RemarqueClient[] = propres.map((texte, i) => ({
      id: 'r_' + (base + i).toString(36),
      texte,
      versionPrototype: u.prototypeVersion ?? 1,
      creeLe: base + i,
    }));
    return {
      ...u,
      remarques: [...(u.remarques ?? []), ...nouvelles],
      statut: 'revision_demandee',
    };
  });
}

// Variante simple : une seule remarque.
export async function ajouterRemarque(
  useCaseId: string,
  texte: string
): Promise<UseCase[]> {
  return ajouterRemarques(useCaseId, [texte]);
}

// Enregistre le résultat du cadrage technique (infra + plan de packaging).
export async function enregistrerCadrageTechnique(
  useCaseId: string,
  cadrage: CadrageTechnique
): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({
    ...u,
    cadrageTechnique: cadrage,
    statut: 'pret_a_packager',
  }));
}
