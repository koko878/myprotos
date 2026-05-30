// Persistance des use cases. DEUX MODES, transparent pour les écrans :
//   - Supabase configuré -> base de données partagée (auth + rôles)
//   - sinon -> AsyncStorage local (mode démo / hors-ligne)
// Toutes les fonctions dérivées (prototype, remarques, pièces jointes…) passent
// par ces fonctions de base, donc héritent automatiquement du bon mode.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as remote from './projets';
import { supabaseDisponible } from './supabase';
import { CadrageTechnique, PieceJointe, RemarqueClient, StatutUseCase, UseCase } from './types';

const CLE = 'usecases_v1';
const distant = () => supabaseDisponible();

export async function chargerUseCases(): Promise<UseCase[]> {
  if (distant()) return remote.listerProjets();
  try {
    const brut = await AsyncStorage.getItem(CLE);
    if (!brut) return [];
    return JSON.parse(brut) as UseCase[];
  } catch {
    return [];
  }
}

export async function sauvegarderUseCases(liste: UseCase[]): Promise<void> {
  // Utilisé uniquement en mode local.
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(liste));
  } catch {
    // silencieux en prototype
  }
}

export async function ajouterUseCase(uc: UseCase): Promise<UseCase[]> {
  if (distant()) {
    await remote.creerProjet(uc);
    return remote.listerProjets();
  }
  const liste = await chargerUseCases();
  const nouvelle = [uc, ...liste];
  await sauvegarderUseCases(nouvelle);
  return nouvelle;
}

// Crée un projet et renvoie son ID réel (DB en mode distant, sinon l'id local).
// À utiliser pour naviguer juste après création.
export async function creerEtId(uc: UseCase): Promise<string> {
  if (distant()) {
    const id = await remote.creerProjet(uc);
    return id ?? uc.id;
  }
  await ajouterUseCase(uc);
  return uc.id;
}

export async function trouverUseCase(id: string): Promise<UseCase | undefined> {
  if (distant()) return remote.trouverProjet(id);
  const liste = await chargerUseCases();
  return liste.find((u) => u.id === id);
}

export async function mettreAJourStatut(
  id: string,
  statut: StatutUseCase
): Promise<UseCase[]> {
  return modifierUseCase(id, (u) => ({ ...u, statut }));
}

// Applique une transformation à un use case et persiste.
export async function modifierUseCase(
  id: string,
  maj: (uc: UseCase) => UseCase
): Promise<UseCase[]> {
  if (distant()) {
    await remote.modifierProjet(id, maj);
    return remote.listerProjets();
  }
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

// Ajoute des pièces jointes (logo, charte, docs…) à un projet.
export async function ajouterPiecesJointes(
  useCaseId: string,
  pieces: PieceJointe[]
): Promise<UseCase[]> {
  if (pieces.length === 0) return modifierUseCase(useCaseId, (u) => u);
  return modifierUseCase(useCaseId, (u) => ({
    ...u,
    piecesJointes: [...(u.piecesJointes ?? []), ...pieces],
  }));
}

export async function supprimerPieceJointe(
  useCaseId: string,
  pieceId: string
): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({
    ...u,
    piecesJointes: (u.piecesJointes ?? []).filter((p) => p.id !== pieceId),
  }));
}

// Dépose manuellement le HTML du prototype (généré hors-app par Claude ici).
export async function deposerPrototypeHtml(
  useCaseId: string,
  html: string
): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({
    ...u,
    prototypeHtml: html,
    prototypeGenereLe: Date.now(),
    prototypeVersion: (u.prototypeVersion ?? 0) + 1,
    statut: 'prototype_genere',
  }));
}
