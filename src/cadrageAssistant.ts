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

import { Complexite, UseCase } from './types';

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

// Adaptateur LLM optionnel. Branché automatiquement si une clé API est fournie
// (via expo extra / variable d'environnement). En mode prototype : non utilisé,
// l'expérience reste 100% fonctionnelle grâce au moteur local ci-dessus.
export async function maybeCallLLM(_prompt: string): Promise<string | null> {
  // TODO (prod) : appeler l'API Claude pour une reformulation/synthèse plus fine.
  // Exemple d'intégration :
  //   const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  //   if (!key) return null;
  //   const res = await fetch('https://api.anthropic.com/v1/messages', { ... });
  return null;
}
