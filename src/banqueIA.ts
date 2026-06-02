// Analyse IA de la banque d'idées :
//   1. Repère les idées qui existent DÉJÀ ailleurs (produits/acteurs connus),
//      avec des évidences (noms d'acteurs, exemples concrets).
//   2. Identifie les idées à fort potentiel ("licorne"). S'il n'y en a pas,
//      l'IA doit le dire franchement — on ne force rien.
// Utilise la cascade LLM (Groq → Gemini → Deepseek) en sortie JSON.

import { appelerGemini } from './llm';
import { UseCase } from './types';

export interface IdeeExistante {
  id: string; // id du use case concerné
  titre: string;
  verdict: 'existe_deja' | 'partiellement' | 'original';
  acteurs: string[]; // produits/entreprises qui font déjà ça (évidences)
  explication: string; // pourquoi : ce qui existe déjà et en quoi
}

export interface IdeeLicorne {
  id: string;
  titre: string;
  potentiel: 'fort' | 'tres_fort';
  raison: string; // pourquoi ça peut scaler massivement
  marche: string; // taille / dynamique du marché visé
}

export interface AnalyseBanque {
  existantes: IdeeExistante[];
  licornes: IdeeLicorne[];
  syntheseLicornes: string; // message si aucune licorne (ou résumé)
}

const SYSTEME = `Tu es un analyste senior en innovation et venture capital. On te fournit une
liste d'idées de produits/applications (issues de cadrages métier). Tu dois, en français :

1) EXISTANT : pour CHAQUE idée, dire si elle existe déjà sur le marché. Sois honnête et
   factuel. Cite des ACTEURS/PRODUITS réels et connus qui font déjà cela (évidences). Verdict :
   - "existe_deja" : de nombreux produits établis font exactement ça
   - "partiellement" : des solutions proches existent mais avec des angles différents
   - "original" : peu ou pas d'acteur connu sur ce créneau précis
   N'invente jamais d'acteur : si tu n'es pas sûr, mets une liste vide et explique.

2) LICORNES : identifie UNIQUEMENT les idées avec un vrai potentiel de très forte croissance
   (marché immense, scalabilité, effet réseau, timing). NE FORCE RIEN : s'il n'y a aucune
   idée à potentiel licorne, renvoie une liste "licornes" VIDE et explique-le dans
   "syntheseLicornes". Mieux vaut zéro licorne qu'une licorne inventée.

Réponds STRICTEMENT en JSON, sans texte autour, au format :
{
  "existantes": [
    { "id": "<id>", "titre": "<titre>", "verdict": "existe_deja|partiellement|original",
      "acteurs": ["Acteur1", "Acteur2"], "explication": "..." }
  ],
  "licornes": [
    { "id": "<id>", "titre": "<titre>", "potentiel": "fort|tres_fort",
      "raison": "...", "marche": "..." }
  ],
  "syntheseLicornes": "..."
}`;

function s(v: any, def = ''): string {
  return typeof v === 'string' ? v : def;
}

function arrStr(v: any): string[] {
  return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
}

export async function analyserBanque(ideas: UseCase[]): Promise<AnalyseBanque | null> {
  if (ideas.length === 0) {
    return { existantes: [], licornes: [], syntheseLicornes: 'Aucune idée dans la banque pour le moment.' };
  }

  // On envoie un résumé compact de chaque idée (id + titre + domaine + problème + objectif).
  const liste = ideas
    .map((u, i) => {
      const bits = [
        `#${i + 1} id=${u.id}`,
        `titre: ${u.titre}`,
        u.domaine ? `domaine: ${u.domaine}` : '',
        u.probleme ? `problème: ${u.probleme}` : '',
        u.objectif ? `objectif: ${u.objectif}` : '',
      ].filter(Boolean);
      return bits.join(' | ');
    })
    .join('\n');

  const prompt = `Voici les idées de la banque (utilise EXACTEMENT les "id" fournis dans ta réponse) :\n\n${liste}`;

  const brut = await appelerGemini(`${SYSTEME}\n\n${prompt}`, { json: true, temperature: 0.4 });
  if (!brut) return null;

  try {
    // Tolère un éventuel bloc ```json … ``` autour.
    const net = brut.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const j = JSON.parse(net);
    const idsValides = new Set(ideas.map((u) => u.id));

    const existantes: IdeeExistante[] = Array.isArray(j?.existantes)
      ? j.existantes
          .map((e: any) => ({
            id: s(e?.id),
            titre: s(e?.titre),
            verdict: (['existe_deja', 'partiellement', 'original'].includes(e?.verdict)
              ? e.verdict
              : 'partiellement') as IdeeExistante['verdict'],
            acteurs: arrStr(e?.acteurs),
            explication: s(e?.explication),
          }))
          // On garde celles dont l'id correspond à une idée réelle (sinon on retitre).
          .map((e: IdeeExistante) => {
            if (!idsValides.has(e.id)) {
              const parTitre = ideas.find((u) => u.titre === e.titre);
              if (parTitre) e.id = parTitre.id;
            }
            return e;
          })
      : [];

    const licornes: IdeeLicorne[] = Array.isArray(j?.licornes)
      ? j.licornes.map((l: any) => ({
          id: s(l?.id),
          titre: s(l?.titre),
          potentiel: (l?.potentiel === 'tres_fort' ? 'tres_fort' : 'fort') as IdeeLicorne['potentiel'],
          raison: s(l?.raison),
          marche: s(l?.marche),
        }))
      : [];

    return {
      existantes,
      licornes,
      syntheseLicornes: s(
        j?.syntheseLicornes,
        licornes.length === 0 ? 'Aucune idée à potentiel licorne identifiée pour le moment.' : ''
      ),
    };
  } catch {
    return null;
  }
}
