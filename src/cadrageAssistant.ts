// Assistant de cadrage IA.
//
// Rôle : transformer une idée floue exprimée par un demandeur en un USE CASE
// structuré et "exploitable" par des experts data/IA. C'est le différenciateur
// du produit : on dérisque le projet AVANT la mise en relation.
//
// Implémentation : moteur conversationnel à étapes, enrichi d'heuristiques
// (détection de domaine, suggestion de KPIs, estimation de complexité/budget).
// L'adaptateur `maybeCallLLM` permet de brancher l'API Claude quand une clé
// est disponible ; sinon on tourne en "IA simulée" 100% locale (mode prototype).

import { appelerGemini, chatGemini, iaDisponible } from './llm';
import {
  CLE_CADRAGE,
  CLE_CHALLENGE_CADRAGE,
  CLE_CHALLENGE_PROTO,
  enregistrerDefaut,
} from './promptsAgents';
import { promptEffectif } from './reglages';
import {
  BonCommande,
  CadrageTechnique,
  CibleDeploiement,
  Complexite,
  CoutRun,
  EstimationROI,
  MakeOrBuy,
  Message,
  PertinenceDigitale,
  PostePrix,
  SolutionMarche,
  SpecPrototype,
  UseCase,
  VentilationPrix,
} from './types';

export interface CadrageEtape {
  cle: keyof CadrageReponses;
  question: string;
  suggestions?: string[];
}

export interface CadrageReponses {
  idee: string;
  probleme: string;
  objectif: string;
  donnees: string;
  utilisateurs: string;
  contraintes: string;
}

// Déroulé du cadrage. Chaque étape capture une dimension clé d'un use case.
export const ETAPES: CadrageEtape[] = [
  {
    cle: 'idee',
    question:
      "En une phrase, quelle est l'idée ou le besoin que vous aimeriez explorer ?",
    suggestions: [
      'Prédire le risque de churn de mes clients',
      'Automatiser le tri de documents entrants',
      'Un assistant IA pour mon support client',
    ],
  },
  {
    cle: 'probleme',
    question:
      "Quel problème métier concret cela résoudrait ? Qu'est-ce qui coince aujourd'hui ?",
    suggestions: [
      'On perd du temps sur des tâches manuelles',
      "On n'anticipe pas assez, on subit",
      'Les données existent mais ne sont pas exploitées',
    ],
  },
  {
    cle: 'objectif',
    question:
      "Quel résultat mesurable viseriez-vous ? (ex : -20% de temps de traitement)",
    suggestions: [
      'Réduire les coûts',
      'Gagner du temps / automatiser',
      "Augmenter le chiffre d'affaires",
    ],
  },
  {
    cle: 'donnees',
    question:
      'De quelles données disposez-vous déjà pour alimenter une solution ?',
    suggestions: [
      'Une base clients / CRM',
      'Des documents (PDF, e-mails)',
      'Peu / pas encore de données structurées',
    ],
  },
  {
    cle: 'utilisateurs',
    question: 'Qui utiliserait la solution au quotidien ?',
    suggestions: [
      'Les équipes opérationnelles',
      'Le service client',
      'Le comité de direction (pilotage)',
    ],
  },
  {
    cle: 'contraintes',
    question:
      "Des contraintes à connaître ? (délai, budget, conformité RGPD, on-premise...)",
    suggestions: [
      'Budget limité, on veut un POC rapide',
      'Données sensibles, RGPD important',
      'Pas de contrainte forte pour l’instant',
    ],
  },
];

// ---- Heuristiques de "compréhension" ----------------------------------------

const DOMAINES: { mots: string[]; domaine: string }[] = [
  { mots: ['client', 'churn', 'crm', 'vente', 'marketing', 'campagne', 'lead'], domaine: 'Marketing & Ventes' },
  { mots: ['document', 'pdf', 'email', 'mail', 'contrat', 'facture', 'ocr'], domaine: 'Gestion documentaire' },
  { mots: ['support', 'ticket', 'chatbot', 'assistant', 'faq', 'sav'], domaine: 'Relation client' },
  { mots: ['production', 'usine', 'machine', 'maintenance', 'capteur', 'iot', 'qualité'], domaine: 'Industrie & IoT' },
  { mots: ['fraude', 'risque', 'crédit', 'finance', 'comptable', 'paiement'], domaine: 'Finance & Risque' },
  { mots: ['stock', 'logistique', 'livraison', 'supply', 'prévision', 'demande'], domaine: 'Supply Chain' },
  { mots: ['rh', 'recrutement', 'cv', 'collaborateur', 'talent'], domaine: 'Ressources Humaines' },
];

function detecterDomaine(texte: string): string {
  const t = texte.toLowerCase();
  for (const d of DOMAINES) {
    if (d.mots.some((m) => t.includes(m))) return d.domaine;
  }
  return 'Transverse';
}

// Propose des KPIs pertinents en fonction du vocabulaire de l'objectif/problème.
function suggererKpis(reponses: CadrageReponses): string[] {
  const t = (reponses.objectif + ' ' + reponses.probleme + ' ' + reponses.idee).toLowerCase();
  const kpis = new Set<string>();
  if (/(temps|automat|rapid|manuel|traitement)/.test(t)) kpis.add('Temps de traitement (h/dossier)');
  if (/(coût|cout|économie|economie|dépense)/.test(t)) kpis.add('Coût opérationnel évité (€/mois)');
  if (/(churn|fidél|fidel|rétention|retention|client)/.test(t)) kpis.add('Taux de rétention client (%)');
  if (/(vente|ca|chiffre|revenu|conversion|lead)/.test(t)) kpis.add('Taux de conversion (%)');
  if (/(fraude|risque|erreur|défaut|defaut|qualité|qualite)/.test(t)) kpis.add('Taux de détection / précision (%)');
  if (/(satisfaction|support|client|sav)/.test(t)) kpis.add('Satisfaction client (CSAT/NPS)');
  if (kpis.size === 0) {
    kpis.add('Gain de productivité (%)');
    kpis.add('Adoption par les utilisateurs (%)');
  }
  return Array.from(kpis).slice(0, 3);
}

// Estime complexité + budget à partir de signaux simples (données, contraintes).
function estimerComplexite(reponses: CadrageReponses): {
  complexite: Complexite;
  budget: string;
  approche: string;
} {
  const t = (reponses.idee + ' ' + reponses.donnees + ' ' + reponses.contraintes).toLowerCase();
  let score = 0;
  if (/(peu|pas encore|aucune|sans donnée|sans donnees)/.test(reponses.donnees.toLowerCase())) score += 2;
  if (/(rgpd|sensible|on-?premise|conformité|conformite|santé|sante|bancaire)/.test(t)) score += 2;
  if (/(temps réel|temps reel|production|industrialis|scalab)/.test(t)) score += 2;
  if (/(prédi|predi|modèle|modele|machine learning|ml|scoring|prévision|prevision)/.test(t)) score += 1;
  if (/(llm|gpt|génératif|generatif|nlp|texte|document|chatbot|assistant)/.test(t)) score += 1;

  let complexite: Complexite = 'Faible';
  let budget = '5 000 € – 12 000 €';
  if (score >= 3 && score < 5) {
    complexite = 'Moyenne';
    budget = '12 000 € – 30 000 €';
  } else if (score >= 5) {
    complexite = 'Élevée';
    budget = '30 000 € – 80 000 €';
  }

  // Piste technique proposée selon le type de problème.
  let approche = 'Tableau de bord analytique + règles métier';
  if (/(document|pdf|email|mail|contrat|facture|texte|nlp)/.test(t)) {
    approche = 'Extraction documentaire (OCR + LLM) et structuration automatique';
  } else if (/(chatbot|assistant|support|faq|question)/.test(t)) {
    approche = 'Assistant conversationnel (RAG sur votre base de connaissances)';
  } else if (/(prédi|predi|churn|risque|fraude|scoring|prévision|prevision|demande)/.test(t)) {
    approche = 'Modèle prédictif (ML supervisé) + monitoring de la dérive';
  } else if (/(image|photo|vision|défaut|defaut|caméra|camera)/.test(t)) {
    approche = 'Vision par ordinateur (détection / classification d’images)';
  }
  return { complexite, budget, approche };
}

// Score de maturité du cadrage : récompense les réponses riches et précises.
function calculerScoreCadrage(reponses: CadrageReponses, kpis: string[]): number {
  const champs = [reponses.idee, reponses.probleme, reponses.objectif, reponses.donnees, reponses.utilisateurs, reponses.contraintes];
  let score = 0;
  for (const c of champs) {
    if (c.trim().length > 0) score += 8; // présence
    if (c.trim().length > 40) score += 5; // précision
  }
  if (/\d/.test(reponses.objectif)) score += 8; // objectif chiffré = +
  score += Math.min(kpis.length * 3, 9);
  return Math.min(100, Math.round(score));
}

// ---- ROI & spec prototype : génération locale (repli sans IA) ---------------

// Milieu d'une fourchette budgétaire "x € – y €".
function milieuBudget(budget: string): number {
  const nums = (budget.match(/\d[\d\s]*/g) || []).map((x) => parseInt(x.replace(/\s/g, ''), 10));
  if (nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2);
  if (nums.length === 1) return nums[0];
  return 18000;
}

// ROI heuristique : à défaut de chiffres, on pose une économie annuelle
// prudente indexée sur l'investissement (ordre de grandeur, à valider).
function roiLocal(uc: {
  titre: string;
  approcheSuggeree: string;
  budgetEstime: string;
  objectif: string;
}): EstimationROI {
  const investissementEur = milieuBudget(uc.budgetEstime);
  // Multiplicateur de gain selon la présence d'un objectif chiffré.
  const facteur = /\d/.test(uc.objectif) ? 3 : 2.2;
  const gainAnnuelEur = Math.round((investissementEur * facteur) / 1000) * 1000;
  const roiAn1Pct = Math.round(((gainAnnuelEur - investissementEur) / investissementEur) * 100);
  const retourMois = Math.max(1, Math.round(investissementEur / (gainAnnuelEur / 12)));
  return {
    hypotheses:
      'Estimation prudente, à confirmer avec vos volumes et coûts réels (gain ≈ ' +
      facteur +
      '× l’investissement la 1ʳᵉ année).',
    gainAnnuelEur,
    investissementEur,
    retourMois,
    roiAn1Pct,
    detail: `Sur la base de l’objectif visé, ${uc.approcheSuggeree.toLowerCase()} génère une économie/gain estimé de ${gainAnnuelEur.toLocaleString('fr-FR')} €/an.`,
  };
}

function specLocale(uc: {
  titre: string;
  probleme: string;
  objectif: string;
  donnees: string;
  approcheSuggeree: string;
  kpis: string[];
}): SpecPrototype {
  return {
    resume: `Prototype démontrant : ${uc.objectif || uc.titre}.`,
    fonctionnalites: [
      'Écran principal illustrant le parcours utilisateur clé',
      `Traitement cœur : ${uc.approcheSuggeree}`,
      'Données d’exemple intégrées pour la démonstration',
      'Affichage des résultats et des KPIs clés',
    ],
    donneesEntree:
      uc.donnees && !/(peu|pas|aucune)/i.test(uc.donnees)
        ? uc.donnees
        : 'Aucune donnée fournie : jeu de données d’exemple intégré au prototype.',
    sortieAttendue: 'Démonstration interactive illustrant le résultat métier.',
    criteresAcceptation: [
      'Le parcours principal est démontrable de bout en bout.',
      `Illustre les KPIs : ${uc.kpis.join(', ')}.`,
    ],
  };
}

// Complète un use case avec roi/spec s'ils manquent (utilisé par tous les
// chemins : IA conversationnelle, synthèse LLM, et repli 100% local).
function enrichir(uc: UseCase): UseCase {
  return {
    ...uc,
    roi: uc.roi ?? roiLocal(uc),
    spec: uc.spec ?? specLocale(uc),
  };
}

// ---- Synthèse finale --------------------------------------------------------

export function synthetiserUseCase(reponses: CadrageReponses): UseCase {
  const domaine = detecterDomaine(reponses.idee + ' ' + reponses.probleme);
  const kpis = suggererKpis(reponses);
  const { complexite, budget, approche } = estimerComplexite(reponses);
  const scoreCadrage = calculerScoreCadrage(reponses, kpis);

  const titre = reponses.idee.length > 60 ? reponses.idee.slice(0, 57) + '…' : reponses.idee || 'Nouveau use case';

  return enrichir({
    id: 'uc_' + Date.now().toString(36),
    titre: titre.charAt(0).toUpperCase() + titre.slice(1),
    domaine,
    probleme: reponses.probleme,
    objectif: reponses.objectif,
    kpis,
    donnees: reponses.donnees,
    utilisateurs: reponses.utilisateurs,
    contraintes: reponses.contraintes,
    approcheSuggeree: approche,
    complexite,
    scoreCadrage,
    budgetEstime: budget,
    statut: 'brouillon',
    creeLe: Date.now(),
  });
}

// Réaction conversationnelle de l'assistant après chaque réponse de l'utilisateur.
// Donne l'impression d'une IA qui "rebondit" intelligemment.
export function reactionAssistant(etape: CadrageEtape, reponse: string): string {
  const txt = reponse.trim();
  switch (etape.cle) {
    case 'idee': {
      const dom = detecterDomaine(txt);
      return `Compris 👍 Je classe ça dans le domaine « ${dom} ». Creusons le contexte métier.`;
    }
    case 'objectif':
      return /\d/.test(txt)
        ? 'Excellent, un objectif chiffré rend le projet bien plus crédible pour les experts.'
        : 'Noté. Astuce : un chiffre (ex. -20%, +15%) renforcera l’attractivité de votre use case.';
    case 'donnees':
      return /(peu|pas|aucune)/.test(txt.toLowerCase())
        ? 'Pas de souci : une phase de collecte/préparation des données pourra être intégrée au prototype.'
        : 'Parfait, des données disponibles accélèrent fortement un prototype.';
    case 'contraintes':
      return 'Merci. Je synthétise votre use case structuré…';
    default:
      return 'Très clair, on continue.';
  }
}

// ---- Synthèse enrichie par LLM (Gemini) -------------------------------------

const CHAMPS_LLM: Complexite[] = ['Faible', 'Moyenne', 'Élevée'];

function construirePrompt(reponses: CadrageReponses): string {
  return `Tu es un consultant senior en data/IA. À partir des réponses brutes d'un client, produis un use case structuré, clair et crédible pour des experts data/IA.

Réponds UNIQUEMENT en JSON valide avec ce schéma exact :
{
  "titre": "titre court et percutant (max 70 caractères)",
  "domaine": "un domaine métier (ex: Marketing & Ventes, Industrie, Finance...)",
  "probleme": "reformulation claire du problème métier (1-2 phrases)",
  "objectif": "objectif business mesurable (1 phrase)",
  "kpis": ["3 KPIs de succès concrets"],
  "approcheSuggeree": "piste technique recommandée (1 phrase)",
  "complexite": "Faible | Moyenne | Élevée",
  "budgetEstime": "fourchette en euros (ex: 12 000 € – 30 000 €)"
}

Réponses du client :
- Idée : ${reponses.idee}
- Problème : ${reponses.probleme}
- Objectif : ${reponses.objectif}
- Données disponibles : ${reponses.donnees}
- Utilisateurs : ${reponses.utilisateurs}
- Contraintes : ${reponses.contraintes}`;
}

/**
 * Synthèse du use case. Tente d'abord Gemini pour une qualité de cadrage
 * supérieure (reformulation, KPIs, approche). Retombe automatiquement sur le
 * moteur heuristique local si l'IA est indisponible ou répond mal.
 */
export async function synthetiserUseCaseIA(
  reponses: CadrageReponses
): Promise<UseCase> {
  const base = synthetiserUseCase(reponses); // moteur local = socle + fallback

  if (!iaDisponible()) return base;

  const brut = await appelerGemini(construirePrompt(reponses), { json: true });
  if (!brut) return base;

  try {
    const j = JSON.parse(brut);
    const complexite: Complexite = CHAMPS_LLM.includes(j.complexite)
      ? j.complexite
      : base.complexite;
    return {
      ...base,
      titre: typeof j.titre === 'string' && j.titre.trim() ? j.titre.trim() : base.titre,
      domaine: typeof j.domaine === 'string' && j.domaine.trim() ? j.domaine.trim() : base.domaine,
      probleme: typeof j.probleme === 'string' && j.probleme.trim() ? j.probleme.trim() : base.probleme,
      objectif: typeof j.objectif === 'string' && j.objectif.trim() ? j.objectif.trim() : base.objectif,
      kpis: Array.isArray(j.kpis) && j.kpis.length ? j.kpis.slice(0, 4).map(String) : base.kpis,
      approcheSuggeree:
        typeof j.approcheSuggeree === 'string' && j.approcheSuggeree.trim()
          ? j.approcheSuggeree.trim()
          : base.approcheSuggeree,
      complexite,
      budgetEstime:
        typeof j.budgetEstime === 'string' && j.budgetEstime.trim()
          ? j.budgetEstime.trim()
          : base.budgetEstime,
      // Le score de maturité reste calculé localement (cohérence garantie).
    };
  } catch {
    return base;
  }
}

// ============================================================================
// MODE CONVERSATIONNEL 100% IA (Gemini pilote tout le dialogue de cadrage)
// ============================================================================

// Clause de confidentialité ajoutée à TOUS les agents face au client. La banque
// d'idées (les projets soumis par d'autres clients) est un ACTIF CONFIDENTIEL de
// GetExp : aucun agent ne doit la divulguer, ni lister/évoquer d'autres projets.
const CONFIDENTIALITE = `
RÈGLE DE CONFIDENTIALITÉ ABSOLUE (non négociable) :
- Tu n'as accès qu'au projet du client courant. Tu ne connais AUCUN autre projet, idée ou client.
- Si on te demande de lister, citer, résumer, comparer ou évoquer d'autres idées/projets/clients passés par GetExp, REFUSE poliment : ces informations sont strictement confidentielles et constituent un actif privé de GetExp. Ne les invente pas non plus.
- Reste centré sur le projet du client courant. Réponse type en cas de demande : « Ces informations sont confidentielles, je me concentre sur votre projet. »`;

const SYSTEM_CADRAGE = `Tu es un consultant senior type McKinsey/BCG, spécialisé data/IA, qui cadre l'idée d'un client (souvent non technique) via un dialogue sur mobile. Tu es bienveillant mais EXIGEANT et lucide : ton rôle n'est pas de flatter l'idée, c'est de la mettre à l'épreuve pour que le client investisse à bon escient.

Contexte : tu as DÉJÀ salué le client et lui as demandé son idée en une phrase. Tu mènes maintenant l'entretien de cadrage.

POSTURE DE CONSEIL (essentiel) :
- CREUSE le problème métier réel ("first principles") : pourquoi ce problème existe, qui souffre, combien ça coûte aujourd'hui, qu'a-t-il déjà essayé. Ne te contente jamais de "je veux une app" — un client veut un RÉSULTAT, pas une app pour faire une app.
- VÉRIFIE LA PERTINENCE D'UNE SOLUTION DIGITALE (réflexe n°1, avant tout chiffrage) : le vrai problème appelle-t-il VRAIMENT une solution digitale, ou est-il ailleurs (organisation, process, formation, recrutement, commercial, qualité…) ? Pose les questions qui le tirent au clair. Si le digital n'est pas (ou pas encore) la bonne réponse, DIS-LE honnêtement et oriente le client vers ce qui réglera réellement son problème — même si cela signifie ne pas vendre de projet. Si le digital n'est qu'une partie de la réponse, précise ce qui relève du digital et ce qui relève d'autre chose.
- CHALLENGE l'idée avec tact, en au moins un échange dédié :
  • Existant marché (OBLIGATOIRE, fais un VRAI effort) : NOMME explicitement 2 à 4 solutions/produits réels et connus qui répondent déjà, en tout ou partie, au besoin — avec ce qu'ils font, leur ordre de prix, et leur limite vis-à-vis du cas du client. Ne réponds jamais "il existe des solutions" en restant vague : CITE des noms concrets. Si tu n'es vraiment pas sûr d'un nom, dis-le, mais cherche d'abord sérieusement.
  • Make vs Buy : aide le client à DÉCIDER entre développer du sur-mesure (Make) et acheter/s'abonner à une solution existante (Buy). Pèse coût total (build + run vs abonnement), délai, différenciation, dépendance fournisseur, intégration au SI. Donne une recommandation claire (make / buy / hybride) et assume-la.
  • Si l'idée est peu différenciante ou déjà bien couverte, DIS-LE franchement et propose soit un angle plus défendable, soit honnêtement d'acheter une solution existante.
- Le but n'est pas de vendre du dev à tout prix : c'est de conseiller le client objectivement, quitte à recommander d'acheter plutôt que de construire.

OBJECTIF DU CADRAGE — à la fin tu dois disposer d'assez d'éléments pour :
1) estimer un RETOUR SUR INVESTISSEMENT (ROI) crédible : ORDRES DE GRANDEUR CHIFFRÉS (volumes, temps/coût actuels, taille d'équipe). Si le client ne sait pas, propose des fourchettes plausibles à valider ;
2) chiffrer le PRIX du projet de façon factuelle (jours-homme par poste) ET le COÛT DE RUN mensuel PRÉCIS (cloud et on-premise). DEVISE : tous les montants en MAD par défaut. Prix projet : un développeur senior freelance au Maroc coûte ~3500 MAD/jour (TJM par défaut). COÛT DE RUN cloud : calcule-le POSTE PAR POSTE sur la stack Azure GetExp (logique Azure Pricing Calculator) — Container Apps + Azure Database for PostgreSQL Flexible + Blob Storage + Key Vault + ACR + Application Insights — en dimensionnant selon la volumétrie/nb d'utilisateurs/stockage. Pour bien estimer, POSE les questions nécessaires (nombre d'utilisateurs, volume de données/fichiers, trafic attendu, disponibilité requise) ;
3) clarifier précisément LE(S) PROCESSUS MÉTIER À DIGITALISER : quelles tâches/étapes manuelles ou existantes l'app va remplacer ou automatiser (l'état actuel "tel quel", puis l'état cible digitalisé). Fais expliciter le déroulé réel du processus aujourd'hui avant de le transposer ;
4) cartographier l'EXPÉRIENCE / PARCOURS UTILISATEUR cible de façon PRÉCISE : accompagne le client, étape par étape, pour décrire ce que l'utilisateur fait dans l'app du début à la fin (écran d'entrée, actions clés, décisions, résultat/sortie). Reformule et fais valider chaque étape. C'est essentiel pour un prototype fidèle ;
5) connaître le PAYS du client et le PAYS DE DÉPLOIEMENT cible de l'app, afin d'intégrer les CONTRAINTES LÉGALES LOCALES pertinentes (protection des données type RGPD en UE / loi 09-08 au Maroc, hébergement local imposé, langue officielle, e-commerce, secteur réglementé…) ;
6) permettre à un agent de code autonome de produire un PROTOTYPE SANS poser AUCUNE question : données d'entrée précises, sortie attendue claire, critères d'acceptation.

DOCUMENTS DU CLIENT : si le client a partagé des documents (leur contenu apparaît dans la conversation, préfixé « [Document partagé … ] »), APPUIE-TOI DESSUS pour affiner le besoin : cite les éléments utiles, pose des questions ciblées sur ce que tu y lis, et intègre ces informations dans le cadrage.

CONTEXTE MARCHÉ MAROC (à utiliser pour situer le budget et rassurer le client) :
- Budgets IT/digital typiques en % du chiffre d'affaires selon le secteur : Services/Banque/Finance 4-6% ; Industrie/Automobile 3-4,5% ; Commerce/Distribution 2-3,5% ; Agriculture/Santé/Éducation 3-5%. Si tu connais (ou estimes) le CA du client, situe l'investissement proposé par rapport à ces repères pour montrer qu'il est raisonnable.
- Aides publiques mobilisables (mentionne-les si pertinent, comme argument de décision) : Pack Digital MOWAKABA (subvention jusqu'à 80% pour les PME, 90% pour les TPE, plafonné à 40 000 DH) ; programmes Maroc PME (Imtiaz, Istitmar) pour cofinancer la mise à niveau digitale.

Règles :
- Réponds en français, ton chaleureux mais professionnel et direct.
- UNE seule question à la fois, courte (2-3 phrases max), en t'appuyant explicitement sur ce que le client vient de dire.
- Couvre progressivement : problème métier creusé ; CHALLENGE (existant marché + build vs buy) ; objectif mesurable ; PROCESSUS À DIGITALISER (état actuel puis cible) ; EXPÉRIENCE / PARCOURS UTILISATEUR précis (plusieurs échanges si besoin) ; VOLUMES & COÛTS ACTUELS ; PAYS du client & PAYS de déploiement (contraintes légales) ; hébergement cible (cloud/on-premise) & volumétrie pour le RUN ; données ; utilisateurs ; contraintes (budget/délai/conformité).
- Propose jusqu'à 3 suggestions de réponses COURTES et concrètes adaptées à SON cas (avec chiffres plausibles si utile).
- Après avoir recueilli assez d'infos (en général 8 à 9 échanges, dont le challenge marché/build-vs-buy, le parcours utilisateur ET les volumes/coûts), TERMINE : mets "done": true et produis le use case complet.
- Ne pose jamais plus de 11 questions.

Réponds TOUJOURS en JSON strict, sans texte autour :
{
  "reply": "ton message (accusé de réception + prochaine question ; ou message de clôture si done=true)",
  "suggestions": ["...", "...", "..."],
  "done": false,
  "useCase": null
}

Quand "done" vaut true, "useCase" doit valoir EXACTEMENT ce schéma (chiffres = nombres, sans symbole) :
{
  "titre": "titre court et percutant (< 70 caractères)",
  "domaine": "domaine métier précis (ex: Marketing & Ventes, Industrie & IoT, Finance & Risque...)",
  "probleme": "problème métier reformulé clairement (1-2 phrases)",
  "objectif": "objectif business mesurable (1 phrase)",
  "kpis": ["3 KPIs de succès concrets"],
  "donnees": "données disponibles (format/source)",
  "utilisateurs": "utilisateurs cibles de la solution",
  "processusADigitaliser": ["processus/tâche métier concret à digitaliser (ex: 'la prise de RDV aujourd'hui par téléphone et cahier papier')", "... 1 à 5 processus, en partant de l'état actuel vers l'état digitalisé"],
  "parcoursUtilisateur": ["étape 1 du parcours (ex: l'utilisateur ouvre l'app et voit X)", "étape 2", "étape 3", "... 3 à 7 étapes décrivant le parcours principal de bout en bout"],
  "paysClient": "pays du client (ex: Maroc, France)",
  "paysDeploiement": "pays de déploiement cible de l'app (souvent le même)",
  "contraintes": "contraintes (budget/délai/conformité), EN INCLUANT les contraintes légales locales du pays de déploiement (protection des données, hébergement, secteur réglementé…)",
  "pertinenceDigitale": {
    "verdict": "digital_pertinent | partiellement | pas_digital",
    "explication": "pourquoi une solution digitale est (ou n'est pas) la bonne réponse ; si pas/partiellement digital, vers quoi orienter le client (organisation, process, formation…)"
  },
  "solutionsMarche": [
    { "nom": "Nom réel d'un produit/acteur existant", "description": "ce qu'il fait en une phrase", "prixIndicatif": "ordre de prix (ex: ~15 €/utilisateur/mois)", "limite": "pourquoi il ne couvre pas parfaitement le besoin du client" }
  ],
  "makeOrBuy": {
    "recommandation": "make | buy | hybride",
    "justification": "pourquoi cette reco (coût total, différenciation, délai, dépendance) en 1-3 phrases",
    "argumentsMake": ["raison de développer sur-mesure", "..."],
    "argumentsBuy": ["raison d'acheter une solution existante", "..."]
  },
  "approcheSuggeree": "piste technique recommandée (1 phrase)",
  "complexite": "Faible | Moyenne | Élevée",
  "budgetEstime": "fourchette en MAD (dirhams marocains), ex: 35 000 MAD – 90 000 MAD",
  "ventilationPrix": {
    "postes": [
      { "poste": "Cadrage & design", "jours": 5, "tjmEur": 3500, "montantEur": 17500 },
      { "poste": "Développement", "jours": 20, "tjmEur": 3500, "montantEur": 70000 },
      { "poste": "Intégration & déploiement", "jours": 5, "tjmEur": 3500, "montantEur": 17500 },
      { "poste": "Tests & recette", "jours": 4, "tjmEur": 3500, "montantEur": 14000 }
    ],
    "totalEur": 119000,
    "tjmMoyenEur": 3500,
    "note": "Chiffrage en jours-homme ; montant = jours × TJM. Tous les montants sont en MAD (dirhams)."
  },
  "coutRun": {
    "cloudMensuelEur": 900,
    "cloudHypotheses": "DÉTAILLE poste par poste, en MAD/mois, sur la stack Azure GetExp (réf. tarifs Azure). Base de calcul indicative (région West Europe, faible charge) : Azure Container Apps ~50-200 MAD ; Azure Database for PostgreSQL Flexible B1ms ~150-300 MAD ; Azure Blob Storage ~30-80 MAD ; Key Vault + ACR + Application Insights ~50-150 MAD. AJUSTE selon la volumétrie/nb d'utilisateurs/stockage captés, et liste chaque poste avec son montant.",
    "onPremiseMensuelEur": 250,
    "onPremiseHypotheses": "DÉTAILLE : amortissement serveur (sur 36 mois), électricité, sauvegardes, maintenance/supervision, certificats. Pas de coût cloud mais coût d'exploitation interne réel.",
    "recommandation": "mode recommandé et pourquoi (selon volumétrie, données, équipe IT du client)"
  },
  "roi": {
    "hypotheses": "rappel des volumes et coûts actuels utilisés pour le calcul",
    "gainAnnuelEur": 60000,
    "investissementEur": 20000,
    "retourMois": 4,
    "roiAn1Pct": 200,
    "detail": "1-2 phrases expliquant le calcul du ROI"
  },
  "spec": {
    "resume": "une phrase décrivant ce que fait le prototype",
    "fonctionnalites": ["3 à 6 fonctionnalités du prototype de démonstration"],
    "donneesEntree": "données d'entrée (un jeu d'exemple réaliste sera intégré si le client n'en fournit pas)",
    "sortieAttendue": "ce que le prototype démontre à l'écran",
    "criteresAcceptation": ["2 à 4 conditions de réussite vérifiables"]
  }
}
(dans ce cas "suggestions" peut être un tableau vide). Calcule roiAn1Pct = round((gainAnnuelEur - investissementEur) / investissementEur * 100) et retourMois = round(investissementEur / (gainAnnuelEur/12)).`;

export interface TourIA {
  reply: string;
  suggestions: string[];
  done: boolean;
  useCase?: UseCase;
}

function s(v: unknown, defaut: string): string {
  return typeof v === 'string' && v.trim() ? v.trim() : defaut;
}

// Score de maturité calculé localement à partir du use case produit par l'IA.
function scoreDepuisUseCase(uc: {
  probleme: string;
  objectif: string;
  donnees: string;
  utilisateurs: string;
  contraintes: string;
  kpis: string[];
}): number {
  let score = 0;
  for (const champ of [uc.probleme, uc.objectif, uc.donnees, uc.utilisateurs, uc.contraintes]) {
    if (champ.trim()) score += 12;
    if (champ.trim().length > 40) score += 4;
  }
  if (/\d/.test(uc.objectif)) score += 10;
  score += Math.min(uc.kpis.length * 4, 12);
  return Math.min(100, Math.round(score));
}

function nombre(v: unknown, defaut: number): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : defaut;
}

function liste(v: unknown, defaut: string[]): string[] {
  return Array.isArray(v) && v.length ? v.map(String).filter((x) => x.trim()) : defaut;
}

// Parse le ROI renvoyé par l'IA, en recalculant les indicateurs dérivés pour
// garantir leur cohérence (l'IA se trompe parfois dans l'arithmétique).
function normaliserRoi(j: any, titre: string, approche: string): EstimationROI | undefined {
  if (!j || typeof j !== 'object') return undefined;
  const gainAnnuelEur = nombre(j.gainAnnuelEur, 0);
  const investissementEur = Math.max(1, nombre(j.investissementEur, 0));
  if (gainAnnuelEur <= 0) return undefined;
  const roiAn1Pct = Math.round(((gainAnnuelEur - investissementEur) / investissementEur) * 100);
  const retourMois = Math.max(1, Math.round(investissementEur / (gainAnnuelEur / 12)));
  return {
    hypotheses: s(j.hypotheses, 'Hypothèses à confirmer avec le client.'),
    gainAnnuelEur,
    investissementEur,
    retourMois,
    roiAn1Pct,
    detail: s(j.detail, `Gain annuel estimé pour « ${titre} » via ${approche.toLowerCase()}.`),
  };
}

function normaliserVentilation(j: any): VentilationPrix | undefined {
  if (!j || typeof j !== 'object' || !Array.isArray(j.postes)) return undefined;
  const postes: PostePrix[] = j.postes
    .map((p: any) => {
      const jours = Math.max(0, nombre(p?.jours, 0));
      const tjmEur = Math.max(0, nombre(p?.tjmEur, 0));
      // Montant = jours × TJM (recalculé pour rester cohérent, même si l'IA dérape).
      const montantEur = jours > 0 && tjmEur > 0 ? Math.round(jours * tjmEur) : Math.max(0, nombre(p?.montantEur, 0));
      return { poste: s(p?.poste, 'Poste'), jours, tjmEur, montantEur };
    })
    .filter((p: PostePrix) => p.montantEur > 0);
  if (postes.length === 0) return undefined;
  const totalEur = postes.reduce((acc, p) => acc + p.montantEur, 0);
  const tjmMoyenEur = j.tjmMoyenEur ? Math.round(nombre(j.tjmMoyenEur, 0)) : undefined;
  return { postes, totalEur, tjmMoyenEur, note: s(j.note, '') || undefined };
}

function normaliserCoutRun(j: any): CoutRun | undefined {
  if (!j || typeof j !== 'object') return undefined;
  const cloudMensuelEur = Math.max(0, nombre(j.cloudMensuelEur, 0));
  const onPremiseMensuelEur = Math.max(0, nombre(j.onPremiseMensuelEur, 0));
  if (cloudMensuelEur <= 0 && onPremiseMensuelEur <= 0) return undefined;
  return {
    cloudMensuelEur,
    cloudHypotheses: s(j.cloudHypotheses, 'Hypothèses cloud à confirmer.'),
    onPremiseMensuelEur,
    onPremiseHypotheses: s(j.onPremiseHypotheses, 'Hypothèses on-premise à confirmer.'),
    recommandation: s(j.recommandation, '') || undefined,
  };
}

function normaliserSolutionsMarche(j: any): SolutionMarche[] | undefined {
  if (!Array.isArray(j)) return undefined;
  const out = j
    .map((x: any) => ({
      nom: s(x?.nom, '').trim(),
      description: s(x?.description, '').trim(),
      prixIndicatif: s(x?.prixIndicatif, '').trim() || undefined,
      limite: s(x?.limite, '').trim() || undefined,
    }))
    .filter((x: SolutionMarche) => x.nom.length > 0)
    .slice(0, 5);
  return out.length ? out : undefined;
}

function normaliserMakeOrBuy(j: any): MakeOrBuy | undefined {
  if (!j || typeof j !== 'object') return undefined;
  const reco = ['make', 'buy', 'hybride'].includes(j.recommandation) ? j.recommandation : 'make';
  const justification = s(j.justification, '').trim();
  if (!justification) return undefined;
  return {
    recommandation: reco,
    justification,
    argumentsMake: liste(j.argumentsMake, []).slice(0, 5),
    argumentsBuy: liste(j.argumentsBuy, []).slice(0, 5),
  };
}

function normaliserPertinence(j: any): PertinenceDigitale | undefined {
  if (!j || typeof j !== 'object') return undefined;
  const explication = s(j.explication, '').trim();
  if (!explication) return undefined;
  const verdict = ['digital_pertinent', 'partiellement', 'pas_digital'].includes(j.verdict)
    ? j.verdict
    : 'digital_pertinent';
  return { verdict, explication };
}

function normaliserSpec(j: any): SpecPrototype | undefined {
  if (!j || typeof j !== 'object') return undefined;
  const resume = s(j.resume, '');
  if (!resume) return undefined;
  return {
    resume,
    fonctionnalites: liste(j.fonctionnalites, ['Démo interactive du résultat']),
    donneesEntree: s(j.donneesEntree, 'Jeu de données d’exemple intégré.'),
    sortieAttendue: s(j.sortieAttendue, 'Démonstration interactive du résultat.'),
    criteresAcceptation: liste(j.criteresAcceptation, ['Le parcours principal est démontrable.']),
  };
}

function normaliserUseCase(j: any): UseCase {
  const kpis = liste(j?.kpis, ['Gain de productivité (%)']).slice(0, 4);
  const complexite: Complexite = ['Faible', 'Moyenne', 'Élevée'].includes(j?.complexite)
    ? j.complexite
    : 'Moyenne';
  let titre = s(j?.titre, 'Nouveau use case');
  if (titre.length > 70) titre = titre.slice(0, 67) + '…';
  const approche = s(j?.approcheSuggeree, 'À préciser avec un expert');
  const champs = {
    probleme: s(j?.probleme, ''),
    objectif: s(j?.objectif, ''),
    donnees: s(j?.donnees, ''),
    utilisateurs: s(j?.utilisateurs, ''),
    contraintes: s(j?.contraintes, ''),
    kpis,
  };
  return enrichir({
    id: 'uc_' + Date.now().toString(36),
    titre,
    domaine: s(j?.domaine, 'Transverse'),
    ...champs,
    approcheSuggeree: approche,
    complexite,
    scoreCadrage: scoreDepuisUseCase(champs),
    budgetEstime: s(j?.budgetEstime, 'À définir'),
    ventilationPrix: normaliserVentilation(j?.ventilationPrix),
    coutRun: normaliserCoutRun(j?.coutRun),
    processusADigitaliser: Array.isArray(j?.processusADigitaliser)
      ? j.processusADigitaliser.map(String).map((x: string) => x.trim()).filter(Boolean).slice(0, 6)
      : undefined,
    pertinenceDigitale: normaliserPertinence(j?.pertinenceDigitale),
    solutionsMarche: normaliserSolutionsMarche(j?.solutionsMarche),
    makeOrBuy: normaliserMakeOrBuy(j?.makeOrBuy),
    parcoursUtilisateur: Array.isArray(j?.parcoursUtilisateur)
      ? j.parcoursUtilisateur.map(String).map((x: string) => x.trim()).filter(Boolean).slice(0, 8)
      : undefined,
    paysClient: s(j?.paysClient, '') || undefined,
    paysDeploiement: s(j?.paysDeploiement, '') || undefined,
    roi: normaliserRoi(j?.roi, titre, approche),
    spec: normaliserSpec(j?.spec),
    statut: 'brouillon',
    creeLe: Date.now(),
  });
}

/**
 * Un tour de l'entretien de cadrage piloté par l'IA.
 * `messages` est l'historique complet (assistant + user). `forceFinish` pousse
 * l'IA à conclure. Renvoie `null` en cas d'échec (le caller gère le repli).
 */
export async function tourCadrageIA(
  messages: Message[],
  forceFinish: boolean,
  contexteClient?: { paysClient?: string; secteur?: string }
): Promise<TourIA | null> {
  if (!iaDisponible()) return null;
  const premierUser = messages.findIndex((m) => m.role === 'user');
  if (premierUser === -1) return null;

  const historique = messages.slice(premierUser).map((m) => ({
    role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
    text: m.texte,
  }));

  // Contexte client connu (profil) : évite de redemander le pays/secteur déjà saisis.
  const infosClient = contexteClient && (contexteClient.paysClient || contexteClient.secteur)
    ? `\n\nINFOS CLIENT DÉJÀ CONNUES (ne les redemande pas, réutilise-les) :${contexteClient.paysClient ? ` pays du client = ${contexteClient.paysClient} (utilise-le comme paysClient par défaut, et demande seulement le pays de DÉPLOIEMENT s'il diffère).` : ''}${contexteClient.secteur ? ` secteur = ${contexteClient.secteur}.` : ''}`
    : '';

  const base = (await promptEffectif(CLE_CADRAGE, SYSTEM_CADRAGE)) + CONFIDENTIALITE + infosClient;
  const sys = forceFinish
    ? base +
      '\n\nIMPORTANT : tu as recueilli assez d\'informations. Termine maintenant ("done": true) en produisant le use case.'
    : base;

  const brut = await chatGemini(sys, historique, { json: true, temperature: 0.6 });
  if (!brut) return null;

  try {
    const j = JSON.parse(brut);
    const tour: TourIA = {
      reply: s(j?.reply, 'Pouvez-vous préciser un peu ?'),
      suggestions: Array.isArray(j?.suggestions) ? j.suggestions.slice(0, 3).map(String) : [],
      done: j?.done === true,
    };
    if (tour.done) tour.useCase = normaliserUseCase(j?.useCase ?? {});
    return tour;
  } catch {
    return null;
  }
}

// ============================================================================
// GÉNÉRATION DU PROTOTYPE HTML (côté admin, invisible pour le client)
// ============================================================================

const SYSTEM_PROTOTYPE = `Tu es un développeur front-end expert ET un consultant produit senior. Tu produis un PROTOTYPE HTML AUTO-PORTÉ (un seul fichier .html) qui démontre visuellement et de façon interactive le use case décrit.

POSTURE D'EXPERT (très important) :
- Le client sait rarement exactement ce qu'il veut, ou n'a qu'une vision limitée. Ton rôle n'est PAS de te limiter à sa demande littérale : tu dois l'enrichir avec ton expertise.
- Va plus loin que le brief : propose des fonctionnalités, écrans, indicateurs ou automatisations à FORTE VALEUR auxquels le client n'a pas pensé, mais qui servent clairement son objectif métier.
- Anticipe les besoins implicites du secteur (bonnes pratiques, attentes des utilisateurs finaux, leviers de croissance/rentabilité, points de friction courants).
- Reste pertinent et réaliste : chaque ajout doit avoir un sens métier évident, pas du gadget. Priorise ce qui crée de la valeur perçue.
- Mets discrètement en avant ces apports (ex. un écran ou un bloc clairement utile) pour que le client découvre des possibilités qu'il n'imaginait pas.

Contraintes STRICTES :
- UN SEUL fichier HTML complet : HTML + CSS + JavaScript inline. AUCUNE dépendance externe, AUCUN CDN, AUCun appel réseau (tout doit fonctionner hors-ligne en ouvrant le fichier).
- Design moderne, soigné, responsive (mobile d'abord), thème clair et professionnel.
- Intègre un JEU DE DONNÉES D'EXEMPLE réaliste en dur (dans le JS) pour rendre la démo crédible et interactive.
- Le prototype doit illustrer concrètement le parcours utilisateur principal et les fonctionnalités clés, avec des interactions réelles (clics, filtres, formulaires, affichage de résultats).
- Pas de Lorem ipsum : utilise un contenu réaliste lié au métier du client.
- Le code doit être valide et s'afficher correctement dès l'ouverture.

Réponds UNIQUEMENT avec le code HTML complet, commençant par <!DOCTYPE html> et finissant par </html>. AUCUN texte avant ou après, AUCUN bloc markdown (pas de \`\`\`).`;

function promptPrototype(uc: UseCase): string {
  const spec = uc.spec;
  // Remarques du client (révisions) : on les intègre comme exigences prioritaires.
  const remarques = (uc.remarques ?? []).map((r) => r.texte);
  const blocRemarques = remarques.length
    ? `\n\nREMARQUES & BESOINS DU CLIENT À PRENDRE EN COMPTE EN PRIORITÉ (nouvelle version) :\n${remarques.map((r, i) => `${i + 1}. ${r}`).join('\n')}\nIntègre impérativement ces demandes dans cette nouvelle version du prototype.`
    : '';
  return `Génère le prototype HTML pour ce projet :

TITRE : ${uc.titre}
DOMAINE : ${uc.domaine}
PROBLÈME : ${uc.probleme}
OBJECTIF : ${uc.objectif}
UTILISATEURS CIBLES : ${uc.utilisateurs}
APPROCHE : ${uc.approcheSuggeree}
KPIS À METTRE EN AVANT : ${uc.kpis.join(', ')}
${uc.processusADigitaliser?.length ? `PROCESSUS À DIGITALISER : ${uc.processusADigitaliser.join(' ; ')}` : ''}
${uc.parcoursUtilisateur?.length ? `PARCOURS UTILISATEUR À RESPECTER (étapes) :\n${uc.parcoursUtilisateur.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}` : ''}
${uc.paysDeploiement ? `PAYS DE DÉPLOIEMENT : ${uc.paysDeploiement} (respecte la langue, les formats locaux et l'esprit des contraintes légales locales).` : ''}
${uc.langues?.length ? `LANGUES DE L'INTERFACE : ${uc.langues.join(', ')}` : ''}
${spec ? `RÉSUMÉ DU PROTOTYPE : ${spec.resume}
FONCTIONNALITÉS À DÉMONTRER : ${spec.fonctionnalites.join(' ; ')}
DONNÉES D'EXEMPLE : ${spec.donneesEntree}
RÉSULTAT À MONTRER : ${spec.sortieAttendue}` : ''}${blocRemarques}

Crée une démo interactive et convaincante de ce produit. Ne te limite pas à la demande littérale : en bon expert, AJOUTE des fonctionnalités, écrans ou indicateurs à forte valeur que le client n'a pas demandés explicitement mais qui servent son objectif, et qui lui feront découvrir des possibilités auxquelles il n'avait pas pensé.`;
}

// Nettoie une réponse LLM pour ne garder que le document HTML.
function extraireHtml(brut: string): string | null {
  let t = brut.trim();
  // Retire un éventuel fence markdown ```html ... ```
  t = t.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
  const debut = t.search(/<!DOCTYPE html>|<html[\s>]/i);
  if (debut === -1) return null;
  const fin = t.toLowerCase().lastIndexOf('</html>');
  if (fin === -1) return null;
  return t.slice(debut, fin + '</html>'.length);
}

// Backend optionnel : boucle agentique Claude (façon Claude Code) qui écrit,
// teste et corrige le prototype. Bien supérieur à un appel LLM unique. Si l'URL
// n'est pas configurée ou échoue, on retombe sur la génération directe (Gemini).
const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

export function backendDisponible(): boolean {
  return BACKEND_URL.length > 0;
}

export type MoteurProto = 'claude' | 'gemini';

export interface ResultatProto {
  html: string;
  moteur: MoteurProto; // qui a réellement produit le prototype
  backendErreur?: string; // message si le backend Claude a échoué (diagnostic)
}

// Appelle le backend agentique. Renvoie le HTML, ou lève avec un message clair
// (pour distinguer "backend down" de "Gemini repli" côté admin).
async function genererViaBackend(uc: UseCase): Promise<string> {
  // Le backend agentique peut prendre 30 s à 3 min (et réveil Render). Timeout large.
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), 240000);
  try {
    const reponse = await fetch(`${BACKEND_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ useCase: uc }),
      signal: ctrl.signal,
    });
    if (!reponse.ok) {
      let detail = `HTTP ${reponse.status}`;
      try {
        const j = await reponse.json();
        if (j?.error) detail = String(j.error);
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    const data = await reponse.json();
    const html = data?.html;
    if (typeof html === 'string' && /<html[\s>]/i.test(html)) return html;
    throw new Error('Réponse backend invalide (pas de HTML).');
  } finally {
    clearTimeout(minuteur);
  }
}

/**
 * Génère le prototype HTML auto-porté pour un use case (action admin).
 * Priorité au backend agentique Claude (qualité supérieure) ; repli sur l'appel
 * LLM direct (Gemini). Renvoie le HTML + le moteur réellement utilisé, ou `null`.
 */
export async function genererPrototypeHtml(uc: UseCase): Promise<ResultatProto | null> {
  // 1) Backend agentique Claude (qualité supérieure) si configuré.
  let backendErreur: string | undefined;
  if (BACKEND_URL) {
    try {
      const html = await genererViaBackend(uc);
      return { html, moteur: 'claude' };
    } catch (e: any) {
      backendErreur = String(e?.message || e);
    }
  }

  // 2) Repli : génération directe par LLM (un seul appel, qualité moindre).
  if (!iaDisponible()) return null;
  const brut = await chatGemini(
    SYSTEM_PROTOTYPE,
    [{ role: 'user', text: promptPrototype(uc) }],
    { temperature: 0.7 }
  );
  if (!brut) return null;
  const html = extraireHtml(brut);
  if (!html) return null;
  return { html, moteur: 'gemini', backendErreur };
}

// ============================================================================
// CADRAGE TECHNIQUE — IA "consultant architecte" (infra + packaging)
// ============================================================================

const SYSTEM_ARCHITECTE = `Tu es un architecte logiciel senior. Le prototype a été validé par le client ; ton rôle est maintenant de cadrer l'ASPECT TECHNIQUE pour livrer l'application en PLUG-AND-PLAY.

STACK STANDARD GETEXP (à respecter dans tes recommandations) :
- Architecture : monolithe modulaire CONTENEURISÉ (Docker). Le MÊME artefact tourne chez le client et chez GetExp ; seule la config (variables d'environnement) change.
- Frontend : React + TypeScript. Backend : Node/NestJS (TypeScript) par défaut, ou Python/FastAPI si le projet est fortement IA/data.
- Base de données : PostgreSQL. Stockage objets : compatible S3 (MinIO on-premise / Azure Blob chez GetExp). Auth : JWT/OAuth2/OIDC (branchable sur SSO/LDAP/AD du client).
- Livraison on-premise : package docker-compose tout-en-un (\`docker compose up\`). Chez GetExp : Azure (Container Apps + PostgreSQL Flexible + Blob + Key Vault).
Adapte ce standard à l'infra captée (ne le contredis pas sans raison ; ton plan de packaging doit s'appuyer dessus).

PREMIÈRE ÉTAPE OBLIGATOIRE — CIBLE DE DÉPLOIEMENT :
Commence par clarifier OÙ l'application sera hébergée, deux options :
  (A) ON-PREMISE / infra du client (ses serveurs ou son propre cloud) ;
  (B) HÉBERGÉ CHEZ GETEXP (clé en main : GetExp héberge et exploite l'app pour le client).
Explique simplement la différence et aide le client à choisir.

SI (B) HÉBERGÉ CHEZ GETEXP : c'est simple, peu de questions techniques (GetExp gère tout). Confirme juste la volumétrie/nb d'utilisateurs attendus et d'éventuelles contraintes de données, puis conclus.

SI (A) ON-PREMISE : tu dois capter, SANS EXCEPTION, TOUTES les informations nécessaires pour livrer un package clé en main qui fonctionne du premier coup chez le client. Couvre IMPÉRATIVEMENT (n'en saute aucune ; si une réponse est vague, reformule et insiste jusqu'à être sûr) :
- Hébergement précis : cloud (AWS/Azure/GCP/OVH…) ou serveurs internes ? fournisseur, région.
- Système d'exploitation cible (distribution Linux/Windows + version).
- Conteneurisation : Docker ? Kubernetes ? rien d'installé ? droits d'installation ?
- Base de données : BDD existante (type + version) à réutiliser, ou à embarquer ?
- Authentification : SSO, LDAP/Active Directory, OAuth, ou aucune ? annuaire existant ?
- Réseau : accès internet sortant ? proxy d'entreprise ? ports ouverts/à ouvrir ? VPN ? nom de domaine/DNS interne ? certificats TLS ?
- Ressources serveur : CPU/RAM/disque disponibles, nb d'utilisateurs simultanés attendus.
- Sécurité/conformité : données sensibles, isolation, sauvegardes, RGPD/normes, exigences particulières.
- Maintenance : qui exploite après livraison ? mises à jour ? supervision/logs souhaités ?

SÉCURITÉ « BY DESIGN » (à intégrer au cadrage) : identifie dès maintenant les DONNÉES SENSIBLES manipulées, QUI y accède (rôles), et les principales MENACES (accès non autorisé, fuite, injection) avec la parade prévue. Le standard GetExp vise OWASP ASVS Niveau 2. Résume ces éléments dans "contraintesSecu".

Règles :
- Réponds en français, ton d'expert pédagogue et rassurant.
- UNE seule question à la fois, courte, en VULGARISANT (le client n'est pas technique). Explique pourquoi tu poses la question si utile.
- Propose jusqu'à 3 suggestions de réponses concrètes et courantes pour l'aider à répondre.
- En mode ON-PREMISE, ne conclus PAS tant qu'un point essentiel reste flou : pose une question de clarification au lieu de deviner. En mode GETEXP, conclus vite.
- Quand tu as TOUT le nécessaire, TERMINE : mets "done": true et produis le plan de packaging plug-and-play. Indique le champ "cible" = "on_premise" ou "getexp".
- Ne pose jamais plus de 12 questions.

Réponds TOUJOURS en JSON strict, sans texte autour :
{
  "reply": "ton message (accusé de réception + prochaine question ; ou clôture si done=true)",
  "suggestions": ["...", "...", "..."],
  "done": false,
  "cadrage": null
}

Quand "done" vaut true, "cadrage" doit valoir EXACTEMENT :
{
  "cible": "on_premise | getexp",
  "hebergement": "synthèse de l'hébergement (cloud/on-premise + fournisseur, ou 'Hébergé par GetExp')",
  "os": "OS cible",
  "conteneurisation": "Docker / Kubernetes / aucun",
  "baseDeDonnees": "BDD existante ou à embarquer",
  "authentification": "SSO / LDAP / OAuth / aucune",
  "reseau": "accès internet, proxy, ports, VPN",
  "contraintesSecu": "conformité, isolation, données sensibles",
  "formatLivraison": "format de packaging recommandé pour du plug-and-play (ex: Image Docker + docker-compose tout-en-un)",
  "etapesDeploiement": ["étapes simples côté client pour déployer, dans l'ordre"],
  "prerequis": ["prérequis côté client avant déploiement"],
  "resumePackaging": "1-2 phrases expliquant comment le package garantit le plug-and-play dans SON infra"
}
(dans ce cas "suggestions" peut être un tableau vide).`;

export interface TourArchitecte {
  reply: string;
  suggestions: string[];
  done: boolean;
  cadrage?: CadrageTechnique;
  cible?: CibleDeploiement;
}

function normaliserCadrageTechnique(j: any): CadrageTechnique {
  return {
    hebergement: s(j?.hebergement, 'À préciser'),
    os: s(j?.os, 'Linux (par défaut)'),
    conteneurisation: s(j?.conteneurisation, 'Docker'),
    baseDeDonnees: s(j?.baseDeDonnees, 'Embarquée dans le package'),
    authentification: s(j?.authentification, 'Aucune (à ajouter si besoin)'),
    reseau: s(j?.reseau, 'À préciser'),
    contraintesSecu: s(j?.contraintesSecu, 'Standard'),
    formatLivraison: s(j?.formatLivraison, 'Image Docker + docker-compose tout-en-un'),
    etapesDeploiement: liste(j?.etapesDeploiement, [
      'Installer Docker sur le serveur cible',
      'Copier le package et lancer docker-compose up',
      'Accéder à l’application via l’URL fournie',
    ]),
    prerequis: liste(j?.prerequis, ['Un serveur avec Docker installé']),
    resumePackaging: s(
      j?.resumePackaging,
      'Le package contient tout le nécessaire pour fonctionner par défaut dans votre environnement.'
    ),
  };
}

/**
 * Un tour de l'entretien de cadrage technique mené par l'IA architecte.
 * Renvoie `null` en cas d'échec (le caller gère le repli).
 */
export async function tourArchitecteIA(
  messages: Message[],
  forceFinish: boolean
): Promise<TourArchitecte | null> {
  if (!iaDisponible()) return null;
  const premierUser = messages.findIndex((m) => m.role === 'user');
  if (premierUser === -1) return null;

  const historique = messages.slice(premierUser).map((m) => ({
    role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
    text: m.texte,
  }));

  const sys = forceFinish
    ? SYSTEM_ARCHITECTE + CONFIDENTIALITE +
      '\n\nIMPORTANT : tu as recueilli assez d\'informations. Termine maintenant ("done": true) en produisant le plan de packaging.'
    : SYSTEM_ARCHITECTE + CONFIDENTIALITE;

  const brut = await chatGemini(sys, historique, { json: true, temperature: 0.5 });
  if (!brut) return null;

  try {
    const j = JSON.parse(brut);
    const tour: TourArchitecte = {
      reply: s(j?.reply, 'Pouvez-vous préciser ?'),
      suggestions: Array.isArray(j?.suggestions) ? j.suggestions.slice(0, 3).map(String) : [],
      done: j?.done === true,
    };
    if (tour.done) {
      tour.cadrage = normaliserCadrageTechnique(j?.cadrage ?? {});
      tour.cible = j?.cadrage?.cible === 'getexp' ? 'getexp' : 'on_premise';
    }
    return tour;
  } catch {
    return null;
  }
}

// ============================================================================
// CHALLENGE DU PROTOTYPE — IA qui aide le client à formuler ses retours
// ============================================================================

const SYSTEM_CHALLENGE = `Tu es un product designer qui aide un client (souvent non technique) à formuler des RETOURS clairs et actionnables sur un prototype qu'il vient de voir.

Le client veut faire évoluer le prototype mais s'exprime souvent de façon vague ("c'est pas terrible", "il manque un truc", "j'aime pas trop"). Ton rôle : creuser pour transformer ça en demandes PRÉCISES et RÉALISABLES qu'un développeur pourra appliquer directement.

Règles :
- Réponds en français, ton bienveillant et concret.
- UNE seule question à la fois, courte. Reformule ce que tu comprends pour confirmer.
- Aide à préciser : QUEL écran/élément ? QUOI changer (couleur, texte, disposition, ajouter/retirer une fonctionnalité, comportement) ? POURQUOI (l'objectif derrière) ?
- Propose jusqu'à 3 suggestions de retours concrets et plausibles pour aider le client à répondre vite.
- Reste réaliste : on parle d'ajustements d'un prototype web, pas de l'impossible.
- Quand tu as assez d'éléments (en général 2 à 4 échanges), TERMINE : mets "done": true et produis la liste structurée des remarques.

Réponds TOUJOURS en JSON strict, sans texte autour :
{
  "reply": "ton message (reformulation + question ; ou récapitulatif si done=true)",
  "suggestions": ["...", "...", "..."],
  "done": false,
  "remarques": null
}

Quand "done" vaut true, "remarques" est un tableau de chaînes : chaque entrée = UNE demande d'amélioration claire et actionnable (ex: "Sur l'écran d'accueil, remplacer le bandeau bleu par les couleurs de la marque (rouge/noir)"). 1 à 6 entrées.`;

export interface TourChallenge {
  reply: string;
  suggestions: string[];
  done: boolean;
  remarques?: string[];
}

/**
 * Un tour de l'entretien de "challenge" du prototype (l'IA aide le client à
 * préciser ses retours). `contexte` décrit le projet pour ancrer la discussion.
 * Renvoie `null` en cas d'échec (le caller gère le repli).
 */
export async function tourChallengeIA(
  contexte: string,
  messages: Message[],
  forceFinish: boolean
): Promise<TourChallenge | null> {
  if (!iaDisponible()) return null;
  const premierUser = messages.findIndex((m) => m.role === 'user');
  if (premierUser === -1) return null;

  const historique = messages.slice(premierUser).map((m) => ({
    role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
    text: m.texte,
  }));

  const baseChallenge = (await promptEffectif(CLE_CHALLENGE_PROTO, SYSTEM_CHALLENGE)) + CONFIDENTIALITE;
  const sys =
    baseChallenge +
    `\n\nContexte du projet (pour t'aider à comprendre) : ${contexte}` +
    (forceFinish
      ? '\n\nIMPORTANT : tu as assez d\'éléments. Termine maintenant ("done": true) en produisant la liste des remarques.'
      : '');

  const brut = await chatGemini(sys, historique, { json: true, temperature: 0.5 });
  if (!brut) return null;

  try {
    const j = JSON.parse(brut);
    const tour: TourChallenge = {
      reply: s(j?.reply, 'Pouvez-vous préciser ce que vous aimeriez ajuster ?'),
      suggestions: Array.isArray(j?.suggestions) ? j.suggestions.slice(0, 3).map(String) : [],
      done: j?.done === true,
    };
    if (tour.done) {
      tour.remarques = liste(j?.remarques, []).slice(0, 6);
    }
    return tour;
  } catch {
    return null;
  }
}

// ============================================================================
// CHALLENGE DU CADRAGE MÉTIER — l'IA affine le use case avec le client
// ============================================================================

const SYSTEM_CHALLENGE_CADRAGE = `Tu es un consultant senior en data/IA. Le client a déjà un cadrage de son projet (résumé fourni plus bas). Il veut le CHALLENGER / l'AFFINER : corriger, préciser, ou changer des éléments (problème, objectif, KPIs, données, utilisateurs, contraintes, budget, approche).

Règles :
- Réponds en français, ton chaleureux et expert.
- UNE question courte à la fois pour comprendre ce qu'il veut ajuster, en t'appuyant sur le cadrage existant.
- Propose jusqu'à 3 suggestions concrètes adaptées à son cas.
- Après 2 à 4 échanges (ou s'il dit que c'est bon), TERMINE : mets "done": true et produis le use case MIS À JOUR complet.

Réponds TOUJOURS en JSON strict, sans texte autour :
{
  "reply": "ton message",
  "suggestions": ["...", "...", "..."],
  "done": false,
  "useCase": null
}

Quand "done" vaut true, "useCase" reprend EXACTEMENT le même schéma que le cadrage initial (titre, domaine, probleme, objectif, kpis, donnees, utilisateurs, contraintes, approcheSuggeree, complexite, budgetEstime, roi{...}, spec{...}) en intégrant les modifications demandées. Conserve les valeurs existantes pour ce qui n'a pas changé.`;

// Enregistre les prompts par défaut pour l'éditeur admin (au chargement du module).
enregistrerDefaut(
  CLE_CADRAGE,
  '🧭 Cadrage métier',
  "L'agent qui mène l'entretien de cadrage de l'idée avec le client (questions, ROI, génération du use case).",
  SYSTEM_CADRAGE
);
enregistrerDefaut(
  CLE_CHALLENGE_CADRAGE,
  '✏️ Challenge du cadrage',
  "L'agent qui aide le client à affiner / corriger son cadrage existant.",
  SYSTEM_CHALLENGE_CADRAGE
);
enregistrerDefaut(
  CLE_CHALLENGE_PROTO,
  '🎨 Challenge du prototype',
  "L'agent qui aide le client à formuler des retours clairs sur le prototype.",
  SYSTEM_CHALLENGE
);

export interface TourChallengeCadrage {
  reply: string;
  suggestions: string[];
  done: boolean;
  useCase?: UseCase;
}

/**
 * Un tour de l'entretien de challenge du CADRAGE. `actuel` = use case courant
 * (sert de base/contexte). Sur done, renvoie le use case mis à jour.
 */
export async function tourChallengeCadrageIA(
  actuel: UseCase,
  messages: Message[],
  forceFinish: boolean
): Promise<TourChallengeCadrage | null> {
  if (!iaDisponible()) return null;
  const premierUser = messages.findIndex((m) => m.role === 'user');
  if (premierUser === -1) return null;

  const historique = messages.slice(premierUser).map((m) => ({
    role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
    text: m.texte,
  }));

  const resume = `Cadrage actuel — Titre: ${actuel.titre} | Domaine: ${actuel.domaine} | Problème: ${actuel.probleme} | Objectif: ${actuel.objectif} | KPIs: ${(actuel.kpis || []).join(', ')} | Données: ${actuel.donnees} | Utilisateurs: ${actuel.utilisateurs} | Contraintes: ${actuel.contraintes} | Approche: ${actuel.approcheSuggeree} | Budget: ${actuel.budgetEstime}`;

  const baseCC = (await promptEffectif(CLE_CHALLENGE_CADRAGE, SYSTEM_CHALLENGE_CADRAGE)) + CONFIDENTIALITE;
  const sys =
    baseCC +
    `\n\n${resume}` +
    (forceFinish ? '\n\nIMPORTANT : termine maintenant ("done": true) avec le use case mis à jour.' : '');

  const brut = await chatGemini(sys, historique, { json: true, temperature: 0.5 });
  if (!brut) return null;

  try {
    const j = JSON.parse(brut);
    const tour: TourChallengeCadrage = {
      reply: s(j?.reply, 'Que souhaitez-vous ajuster dans le cadrage ?'),
      suggestions: Array.isArray(j?.suggestions) ? j.suggestions.slice(0, 3).map(String) : [],
      done: j?.done === true,
    };
    if (tour.done) {
      // On fusionne : la base reste l'actuel, écrasé par les champs renvoyés.
      const maj = normaliserUseCase({ ...actuel, ...(j?.useCase ?? {}) });
      // On conserve l'id et le statut d'origine (ne pas régénérer).
      tour.useCase = { ...maj, id: actuel.id, statut: actuel.statut };
    }
    return tour;
  } catch {
    return null;
  }
}
