// Persistance des use cases. DEUX MODES, transparent pour les écrans :
//   - Supabase configuré -> base de données partagée (auth + rôles)
//   - sinon -> AsyncStorage local (mode démo / hors-ligne)
// Toutes les fonctions dérivées (prototype, remarques, pièces jointes…) passent
// par ces fonctions de base, donc héritent automatiquement du bon mode.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as remote from './projets';
import { supabaseDisponible } from './supabase';
import { BonCommande, CadrageTechnique, CibleDeploiement, PieceJointe, ProfilClient, RemarqueClient, StatutUseCase, UseCase } from './types';

const CLE = 'usecases_v1';
const distant = () => supabaseDisponible();

export async function chargerUseCases(): Promise<UseCase[]> {
  if (distant()) {
    // Base distante + éventuels projets locaux (repli) non encore en base.
    const distants = await remote.listerProjets();
    const locaux = await chargerUseCasesLocal();
    const idsDistants = new Set(distants.map((u) => u.id));
    const seulementLocaux = locaux.filter((u) => !idsDistants.has(u.id));
    return [...seulementLocaux, ...distants];
  }
  return chargerUseCasesLocal();
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
// À utiliser pour naviguer juste après création. Si l'insertion distante échoue,
// on bascule sur le stockage local pour ne JAMAIS naviguer vers un id fantôme.
export async function creerEtId(uc: UseCase): Promise<string> {
  if (distant()) {
    const id = await remote.creerProjet(uc);
    if (id) return id;
    // Échec distant -> repli local (le projet reste accessible/visible).
    const liste = await chargerUseCasesLocal();
    await sauvegarderUseCases([uc, ...liste]);
    return uc.id;
  }
  await ajouterUseCase(uc);
  return uc.id;
}

// Lecture locale brute (utilisée comme repli, indépendamment du mode).
async function chargerUseCasesLocal(): Promise<UseCase[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as UseCase[]) : [];
  } catch {
    return [];
  }
}

export async function trouverUseCase(id: string): Promise<UseCase | undefined> {
  if (distant()) {
    const r = await remote.trouverProjet(id);
    if (r) return r;
    // Repli local (cas d'un projet créé en local après échec d'insertion distante).
    const local = await chargerUseCasesLocal();
    return local.find((u) => u.id === id);
  }
  const liste = await chargerUseCases();
  return liste.find((u) => u.id === id);
}

export async function mettreAJourStatut(
  id: string,
  statut: StatutUseCase
): Promise<UseCase[]> {
  return modifierUseCase(id, (u) => ({ ...u, statut }));
}

// Soumission du projet par le client : passe en "soumis", horodate la
// soumission et fige un snapshot du profil client (qui a soumis l'idée).
export async function soumettreProjet(
  id: string,
  profil?: ProfilClient | null
): Promise<UseCase[]> {
  return modifierUseCase(id, (u) => ({
    ...u,
    statut: 'soumis',
    soumisLe: Date.now(),
    client: profil ?? u.client,
  }));
}

// Applique une transformation à un use case et renvoie l'ÉLÉMENT mis à jour
// (ou undefined si introuvable). Cohérent : opère là où vit réellement le projet
// (base distante OU local), pour ne jamais "perdre" un projet.
export async function modifierEtTrouver(
  id: string,
  maj: (uc: UseCase) => UseCase
): Promise<UseCase | undefined> {
  if (distant()) {
    const r = await remote.modifierProjet(id, maj);
    if (r) return r;
    // Pas en base -> peut-être un projet local (repli). On modifie en local.
  }
  const liste = await chargerUseCasesLocal();
  const item = liste.find((u) => u.id === id);
  if (!item) return undefined;
  const majItem = maj(item);
  await sauvegarderUseCases(liste.map((u) => (u.id === id ? majItem : u)));
  return majItem;
}

// Compat : applique une transformation et renvoie la liste à jour.
export async function modifierUseCase(
  id: string,
  maj: (uc: UseCase) => UseCase
): Promise<UseCase[]> {
  await modifierEtTrouver(id, maj);
  return chargerUseCases();
}


// Enregistre le prototype HTML généré (côté admin) et passe le use case en
// "prototype_genere" pour validation par le client. Incrémente la version
// (utile pour les régénérations après remarques du client).
export async function enregistrerPrototype(
  useCaseId: string,
  prototypeHtml: string
): Promise<UseCase[]> {
  // Généré automatiquement -> aperçu admin (à envoyer ensuite au client).
  return modifierUseCase(useCaseId, (u) => ({
    ...u,
    prototypeHtml,
    prototypeGenereLe: Date.now(),
    prototypeVersion: (u.prototypeVersion ?? 0) + 1,
    statut: 'prototype_pret_admin',
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

// Enregistre le résultat du cadrage technique (infra + plan de packaging),
// avec la cible de déploiement choisie (on-premise / GetExp).
export async function enregistrerCadrageTechnique(
  useCaseId: string,
  cadrage: CadrageTechnique,
  cible?: CibleDeploiement
): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({
    ...u,
    cadrageTechnique: cadrage,
    cibleDeploiement: cible ?? u.cibleDeploiement,
    statut: 'pret_a_packager',
  }));
}

// Tague/détague un projet comme "avorté" (masqué de l'espace admin, conservé en base).
export async function definirAvorte(useCaseId: string, avorte: boolean): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({ ...u, avorte }));
}

// Enregistre le bon de commande validé/signé par le client.
export async function enregistrerBonCommande(
  useCaseId: string,
  bon: BonCommande
): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({
    ...u,
    bonCommande: bon,
    cibleDeploiement: bon.cible,
    statut: 'commande_validee',
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
  // Le prototype est d'abord en aperçu ADMIN ; il n'est visible du client
  // qu'après "Envoyer au client" (envoyerPrototypeAuClient).
  return modifierUseCase(useCaseId, (u) => ({
    ...u,
    prototypeHtml: html,
    prototypeGenereLe: Date.now(),
    prototypeVersion: (u.prototypeVersion ?? 0) + 1,
    statut: 'prototype_pret_admin',
  }));
}

// L'admin envoie le prototype au client (le rend visible côté client).
export async function envoyerPrototypeAuClient(useCaseId: string): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({ ...u, statut: 'prototype_genere' }));
}

// Enregistre les langues choisies pour l'app.
export async function definirLangues(useCaseId: string, langues: string[]): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({ ...u, langues }));
}

// Met à jour les champs métier du use case (après challenge du cadrage par l'IA).
export async function appliquerCadrage(
  useCaseId: string,
  champs: Partial<UseCase>
): Promise<UseCase[]> {
  return modifierUseCase(useCaseId, (u) => ({ ...u, ...champs }));
}
