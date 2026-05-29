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
import { Complexite, Message, UseCase } from './types';

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

// ---- Synthèse finale --------------------------------------------------------

export function synthetiserUseCase(reponses: CadrageReponses): UseCase {
  const domaine = detecterDomaine(reponses.idee + ' ' + reponses.probleme);
  const kpis = suggererKpis(reponses);
  const { complexite, budget, approche } = estimerComplexite(reponses);
  const scoreCadrage = calculerScoreCadrage(reponses, kpis);

  const titre = reponses.idee.length > 60 ? reponses.idee.slice(0, 57) + '…' : reponses.idee || 'Nouveau use case';

  return {
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
  };
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

Règles :
- Réponds en français, ton chaleureux mais professionnel.
- UNE seule question à la fois, courte (2-3 phrases max), en t'appuyant explicitement sur ce que le client vient de dire (montre que tu comprends son métier/secteur).
- Couvre progressivement : le problème métier concret, l'objectif mesurable (chiffré si possible), les données disponibles, les utilisateurs cibles, les contraintes (budget / délai / conformité type RGPD).
- Propose jusqu'à 3 suggestions de réponses COURTES, concrètes et adaptées à SON cas précis, pour l'aider à répondre vite.
- Après avoir recueilli assez d'infos (en général 5 à 6 échanges), TERMINE : mets "done": true et produis le use case structuré.
- Ne pose jamais plus de 7 questions.

Réponds TOUJOURS en JSON strict, sans texte autour :
{
  "reply": "ton message (accusé de réception + prochaine question ; ou message de clôture si done=true)",
  "suggestions": ["...", "...", "..."],
  "done": false,
  "useCase": null
}

Quand "done" vaut true, "useCase" doit valoir :
{
  "titre": "titre court et percutant (< 70 caractères)",
  "domaine": "domaine métier précis (ex: Marketing & Ventes, Industrie & IoT, Finance & Risque...)",
  "probleme": "problème métier reformulé clairement (1-2 phrases)",
  "objectif": "objectif business mesurable (1 phrase)",
  "kpis": ["3 KPIs de succès concrets"],
  "donnees": "données disponibles",
  "utilisateurs": "utilisateurs cibles de la solution",
  "contraintes": "contraintes (budget/délai/conformité)",
  "approcheSuggeree": "piste technique recommandée (1 phrase)",
  "complexite": "Faible | Moyenne | Élevée",
  "budgetEstime": "fourchette en euros, ex: 12 000 € – 30 000 €"
}
(dans ce cas "suggestions" peut être un tableau vide).`;

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

function normaliserUseCase(j: any): UseCase {
  const kpis = Array.isArray(j?.kpis) && j.kpis.length
    ? j.kpis.slice(0, 4).map(String)
    : ['Gain de productivité (%)'];
  const complexite: Complexite = ['Faible', 'Moyenne', 'Élevée'].includes(j?.complexite)
    ? j.complexite
    : 'Moyenne';
  let titre = s(j?.titre, 'Nouveau use case');
  if (titre.length > 70) titre = titre.slice(0, 67) + '…';
  const champs = {
    probleme: s(j?.probleme, ''),
    objectif: s(j?.objectif, ''),
    donnees: s(j?.donnees, ''),
    utilisateurs: s(j?.utilisateurs, ''),
    contraintes: s(j?.contraintes, ''),
    kpis,
  };
  return {
    id: 'uc_' + Date.now().toString(36),
    titre,
    domaine: s(j?.domaine, 'Transverse'),
    ...champs,
    approcheSuggeree: s(j?.approcheSuggeree, 'À préciser avec un expert'),
    complexite,
    scoreCadrage: scoreDepuisUseCase(champs),
    budgetEstime: s(j?.budgetEstime, 'À définir'),
    statut: 'brouillon',
    creeLe: Date.now(),
  };
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

  const sys = forceFinish
    ? SYSTEM_CADRAGE +
      '\n\nIMPORTANT : tu as recueilli assez d\'informations. Termine maintenant ("done": true) en produisant le use case.'
    : SYSTEM_CADRAGE;

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
