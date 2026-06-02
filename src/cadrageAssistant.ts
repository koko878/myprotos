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
  CadrageTechnique,
  Complexite,
  EstimationROI,
  Message,
  SpecPrototype,
  UseCase,
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

const SYSTEM_CADRAGE = `Tu es un consultant senior en data/IA qui aide un client (souvent non technique) à cadrer son idée de projet, via un dialogue sur mobile.

Contexte : tu as DÉJÀ salué le client et lui as demandé son idée en une phrase. Tu mènes maintenant l'entretien de cadrage.

OBJECTIF DU CADRAGE — à la fin tu dois disposer d'assez d'éléments pour :
1) estimer un RETOUR SUR INVESTISSEMENT (ROI) crédible, donc tu DOIS obtenir des ORDRES DE GRANDEUR CHIFFRÉS : volumes (ex. nb de dossiers/mois, nb de clients), temps ou coût actuels (ex. minutes par dossier, € perdus/an, taille d'équipe). Si le client ne sait pas, propose-lui des fourchettes plausibles à valider ;
2) permettre à un agent de code autonome (Claude Code) de produire un PROTOTYPE SANS poser AUCUNE question : il faut donc des données d'entrée précises (format/source), une sortie attendue claire et des critères d'acceptation.

Règles :
- Réponds en français, ton chaleureux mais professionnel.
- UNE seule question à la fois, courte (2-3 phrases max), en t'appuyant explicitement sur ce que le client vient de dire (montre que tu comprends son métier/secteur).
- Couvre progressivement : problème métier ; objectif mesurable ; VOLUMES & COÛTS ACTUELS (indispensables au ROI) ; données disponibles (format/source) ; utilisateurs cibles ; contraintes (budget/délai/conformité RGPD).
- Propose jusqu'à 3 suggestions de réponses COURTES, concrètes et adaptées à SON cas précis (avec des chiffres plausibles quand c'est utile) pour l'aider à répondre vite.
- Après avoir recueilli assez d'infos (en général 6 à 7 échanges, dont au moins un sur les volumes/coûts), TERMINE : mets "done": true et produis le use case complet.
- Ne pose jamais plus de 8 questions.

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
  "contraintes": "contraintes (budget/délai/conformité)",
  "approcheSuggeree": "piste technique recommandée (1 phrase)",
  "complexite": "Faible | Moyenne | Élevée",
  "budgetEstime": "fourchette en euros, ex: 12 000 € – 30 000 €",
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
  forceFinish: boolean
): Promise<TourIA | null> {
  if (!iaDisponible()) return null;
  const premierUser = messages.findIndex((m) => m.role === 'user');
  if (premierUser === -1) return null;

  const historique = messages.slice(premierUser).map((m) => ({
    role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
    text: m.texte,
  }));

  const base = await promptEffectif(CLE_CADRAGE, SYSTEM_CADRAGE);
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

const SYSTEM_ARCHITECTE = `Tu es un architecte logiciel senior. Le prototype a été validé par le client ; ton rôle est maintenant de cadrer l'ASPECT TECHNIQUE pour livrer l'application en PLUG-AND-PLAY : le client doit pouvoir déployer le package et que TOUT fonctionne par défaut dans SON infrastructure.

Tu mènes un entretien avec le client (souvent peu technique) pour obtenir TOUS les détails de son infrastructure. Tu dois couvrir :
- Hébergement : cloud (AWS / Azure / GCP / OVH...) ou on-premise ? quel fournisseur ?
- Système d'exploitation des serveurs cibles (Linux/Windows, version).
- Conteneurisation disponible : Docker ? Kubernetes ? rien ?
- Base de données : déjà une BDD (laquelle, version) ou faut-il l'embarquer ?
- Authentification : SSO, LDAP/Active Directory, OAuth, ou aucune ?
- Réseau : accès internet sortant ? proxy d'entreprise ? ports ouverts ? VPN ?
- Sécurité/conformité : données sensibles, isolation, RGPD, exigences particulières.

Règles :
- Réponds en français, ton d'expert pédagogue et rassurant.
- UNE seule question à la fois, courte, en VULGARISANT (le client n'est pas technique). Explique pourquoi tu poses la question si utile.
- Propose jusqu'à 3 suggestions de réponses concrètes et courantes pour l'aider à répondre (ex. "On est sur AWS", "Tout est sur nos serveurs internes", "Je ne sais pas").
- Si le client ne sait pas, propose l'option la plus standard et avance.
- Quand tu as recueilli l'essentiel (en général 6 à 8 échanges), TERMINE : mets "done": true et produis le plan de packaging plug-and-play.
- Ne pose jamais plus de 9 questions.

Réponds TOUJOURS en JSON strict, sans texte autour :
{
  "reply": "ton message (accusé de réception + prochaine question ; ou clôture si done=true)",
  "suggestions": ["...", "...", "..."],
  "done": false,
  "cadrage": null
}

Quand "done" vaut true, "cadrage" doit valoir EXACTEMENT :
{
  "hebergement": "synthèse de l'hébergement (cloud/on-premise + fournisseur)",
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
    ? SYSTEM_ARCHITECTE +
      '\n\nIMPORTANT : tu as recueilli assez d\'informations. Termine maintenant ("done": true) en produisant le plan de packaging.'
    : SYSTEM_ARCHITECTE;

  const brut = await chatGemini(sys, historique, { json: true, temperature: 0.5 });
  if (!brut) return null;

  try {
    const j = JSON.parse(brut);
    const tour: TourArchitecte = {
      reply: s(j?.reply, 'Pouvez-vous préciser ?'),
      suggestions: Array.isArray(j?.suggestions) ? j.suggestions.slice(0, 3).map(String) : [],
      done: j?.done === true,
    };
    if (tour.done) tour.cadrage = normaliserCadrageTechnique(j?.cadrage ?? {});
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

  const baseChallenge = await promptEffectif(CLE_CHALLENGE_PROTO, SYSTEM_CHALLENGE);
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

  const baseCC = await promptEffectif(CLE_CHALLENGE_CADRAGE, SYSTEM_CHALLENGE_CADRAGE);
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
