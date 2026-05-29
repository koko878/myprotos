// Pool d'experts anonymisés + génération de propositions (simulation de l'offre).
// En production : remplacé par les vrais profils experts et leurs devis.

import { PropositionExpert, UseCase } from './types';

export interface Expert {
  pseudo: string;
  specialite: string;
  note: number;
  missions: number;
}

export const EXPERTS: Expert[] = [
  { pseudo: 'Expert #A37', specialite: 'ML / Prédictif', note: 4.9, missions: 23 },
  { pseudo: 'Expert #C12', specialite: 'Data Engineering', note: 4.7, missions: 15 },
  { pseudo: 'Expert #F88', specialite: 'LLM / RAG', note: 5.0, missions: 31 },
  { pseudo: 'Expert #K04', specialite: 'Computer Vision', note: 4.8, missions: 19 },
  { pseudo: 'Expert #M21', specialite: 'Analytics / BI', note: 4.6, missions: 27 },
];

let seq = 0;
const pid = () => `prop_${Date.now().toString(36)}_${seq++}`;

// Prix de prototype indexé sur la complexité du use case.
// `variation` est un pourcentage (100 = prix de base) ; on arrondit à la centaine.
function prixPrototype(uc: UseCase, variation: number): number {
  const base =
    uc.complexite === 'Élevée' ? 9000 : uc.complexite === 'Moyenne' ? 5500 : 3000;
  return Math.round((base * variation) / 100 / 100) * 100;
}

function delaiPrototype(uc: UseCase, variation: number): number {
  const base = uc.complexite === 'Élevée' ? 18 : uc.complexite === 'Moyenne' ? 12 : 7;
  return Math.max(5, Math.round(base * variation));
}

const PITCHS = [
  "J'ai livré un cas très proche le mois dernier. Je peux réutiliser une base de code et aller vite.",
  'Approche pragmatique : un POC ciblé sur votre KPI principal, puis itération.',
  'Je propose un prototype démontrable, avec un jeu de données synthétique si besoin.',
  'Spécialiste du domaine, je sécurise la partie données et la conformité dès le POC.',
];

// Choisit `n` experts dont la spécialité matche le use case en priorité.
function selectionner(uc: UseCase, n: number): Expert[] {
  const t = (uc.approcheSuggeree + ' ' + uc.domaine).toLowerCase();
  const score = (e: Expert) => {
    const s = e.specialite.toLowerCase();
    if (/rag|llm|assistant|chatbot/.test(t) && s.includes('llm')) return 3;
    if (/prédi|predi|scoring|churn|risque|fraude/.test(t) && s.includes('ml')) return 3;
    if (/vision|image/.test(t) && s.includes('vision')) return 3;
    if (/tableau|analyt|bi|dashboard/.test(t) && /analytics/.test(s)) return 3;
    return e.note; // sinon, on classe par note
  };
  return [...EXPERTS].sort((a, b) => score(b) - score(a)).slice(0, n);
}

// Génère des propositions plausibles pour un use case publié.
export function genererPropositions(uc: UseCase, n = 3): PropositionExpert[] {
  const experts = selectionner(uc, n);
  return experts.map((e, i) => {
    const variation = 90 + i * 12; // un peu de dispersion prix/délai
    return {
      id: pid(),
      expert: e.pseudo,
      specialite: e.specialite,
      note: e.note,
      prixEur: prixPrototype(uc, variation),
      delaiJours: delaiPrototype(uc, variation / 100),
      message: PITCHS[i % PITCHS.length],
      statut: 'proposée',
      creeLe: Date.now() - i * 3600_000,
    };
  });
}
