// Modèles de données de la plateforme.
//
// Parcours produit :
//   1. Cadrage MÉTIER assisté par IA  (le client décrit son besoin)
//   2. Soumission                     (le client envoie son projet)
//   3. Génération du prototype HTML   (côté admin, via l'IA — invisible client)
//   4. Validation du prototype        (le client visualise et valide)
//   5. Cadrage TECHNIQUE              (IA "architecte" : infra + packaging plug-and-play)
//   6. Certification sécurité         (à venir)

export type Complexite = 'Faible' | 'Moyenne' | 'Élevée';

/**
 * Profil du client, collecté à l'inscription. Sert à (1) identifier qui a soumis
 * un projet, (2) alimenter la banque d'idées (segmentation par secteur client).
 * Stocké localement ET copié (snapshot) dans chaque projet créé par le client,
 * pour rester visible côté admin sans dépendre d'une jointure / migration DB.
 */
export interface ProfilClient {
  email?: string;
  age?: number;
  secteur: string; // secteur d'activité du client (son industrie)
  entreprise?: string;
  saisiLe?: number;
}

export type StatutUseCase =
  | 'brouillon' // cadrage métier terminé, pas encore soumis
  | 'soumis' // soumis par le client — en attente de génération (admin)
  | 'prototype_pret_admin' // HTML déposé par l'admin, pas encore envoyé au client
  | 'prototype_genere' // prototype envoyé au client — en attente de sa validation
  | 'revision_demandee' // le client a challengé le prototype — à régénérer (admin)
  | 'prototype_valide' // prototype validé par le client
  | 'cadrage_technique' // cadrage technique infra en cours
  | 'pret_a_packager' // infra cadrée + plan de packaging produit
  | 'certifie'; // certifié sécurité (à venir)

/** Remarque / besoin ajouté par le client pour challenger le prototype. */
export interface RemarqueClient {
  id: string;
  texte: string;
  versionPrototype: number; // n° de version du prototype concerné
  creeLe: number;
}

/**
 * Pièce jointe fournie par le client (logo, charte graphique, doc, image…).
 * Stockée en base64 (data URL) pour rester 100% local, sans backend.
 */
export interface PieceJointe {
  id: string;
  nom: string; // nom de fichier
  type: string; // MIME type (image/png, application/pdf…)
  taille: number; // octets
  dataUrl: string; // contenu encodé (data:...;base64,...)
  creeLe: number;
}

/**
 * Estimation du retour sur investissement, produite par l'IA à partir des
 * volumes et coûts actuels collectés pendant le cadrage métier.
 */
export interface EstimationROI {
  hypotheses: string; // base de calcul (volumes, coûts actuels) reformulée
  gainAnnuelEur: number; // gain / économie estimé par an (€)
  investissementEur: number; // coût projet estimé (€)
  retourMois: number; // délai de retour sur investissement (mois)
  roiAn1Pct: number; // ROI sur 12 mois en %
  detail: string; // explication courte du raisonnement
}

/**
 * Spécification du prototype (usage INTERNE / admin). Sert de contexte à l'IA
 * pour générer le prototype HTML auto-porté. Non affichée au client.
 */
export interface SpecPrototype {
  resume: string; // une phrase : ce que fait le prototype
  fonctionnalites: string[]; // fonctionnalités du prototype (périmètre démo)
  donneesEntree: string; // données d'entrée (ou jeu synthétique)
  sortieAttendue: string; // livrable observable
  criteresAcceptation: string[]; // conditions de réussite vérifiables
}

/**
 * Cadrage technique de l'infrastructure du client, mené par l'IA "architecte".
 * Objectif : packager l'application en PLUG-AND-PLAY (le client déploie, tout
 * fonctionne par défaut).
 */
export interface CadrageTechnique {
  hebergement: string; // cloud (AWS/Azure/GCP) ou on-premise, fournisseur
  os: string; // OS des serveurs cibles
  conteneurisation: string; // Docker / Kubernetes / aucun
  baseDeDonnees: string; // BDD existante ou à fournir
  authentification: string; // SSO / LDAP / OAuth / aucune
  reseau: string; // accès internet, proxy, ports ouverts
  contraintesSecu: string; // conformité, isolation, données sensibles
  // Plan de packaging produit par l'IA :
  formatLivraison: string; // ex. "Image Docker + docker-compose"
  etapesDeploiement: string[]; // étapes plug-and-play côté client
  prerequis: string[]; // prérequis côté client
  resumePackaging: string; // synthèse de la stratégie de packaging
}

/**
 * Use case : objet central de la plateforme, du cadrage métier jusqu'au
 * packaging technique.
 */
export interface UseCase {
  id: string;
  titre: string;
  domaine: string;
  probleme: string;
  objectif: string;
  kpis: string[];
  donnees: string;
  utilisateurs: string;
  contraintes: string;
  approcheSuggeree: string;
  complexite: Complexite;
  scoreCadrage: number; // 0-100 : maturité du cadrage métier
  budgetEstime: string;
  roi?: EstimationROI;
  spec?: SpecPrototype; // contexte interne pour la génération du prototype
  prototypeHtml?: string; // prototype HTML auto-porté généré par l'IA
  prototypeGenereLe?: number; // timestamp de génération
  prototypeVersion?: number; // n° de version du prototype (incrémenté à chaque révision)
  remarques?: RemarqueClient[]; // remarques/besoins du client pour challenger le prototype
  piecesJointes?: PieceJointe[]; // logo, charte, docs fournis par le client
  cadrageTechnique?: CadrageTechnique; // résultat du cadrage technique infra
  langues?: string[]; // langues choisies pour l'app (ex: ['Français','Arabe'])
  client?: ProfilClient; // snapshot du profil client (qui a soumis l'idée)
  soumisLe?: number; // date/heure de soumission par le client
  statut: StatutUseCase;
  creeLe: number;
}

export type Role = 'assistant' | 'user';

export interface Message {
  id: string;
  role: Role;
  texte: string;
  suggestions?: string[];
}
