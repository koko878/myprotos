// Registre central des prompts système des agents IA, avec une clé stable par
// agent (utilisée pour les overrides admin dans `reglages`). Les valeurs par
// défaut sont les prompts d'origine. L'admin peut les surcharger sans recompiler.

export interface AgentPrompt {
  cle: string;       // clé de stockage (stable, ne pas changer)
  titre: string;     // libellé pour l'écran admin
  description: string;
  defaut: string;    // prompt par défaut
}

// IMPORTANT : la valeur `defaut` de chaque agent est injectée depuis
// cadrageAssistant/banqueIA via `enregistrerDefaut` au chargement, pour éviter
// la duplication des longs textes. On garde ici les métadonnées + le registre.

const REGISTRE: Record<string, AgentPrompt> = {};

export function enregistrerDefaut(
  cle: string,
  titre: string,
  description: string,
  defaut: string
): void {
  // On n'écrase pas un défaut déjà enregistré (idempotent).
  if (!REGISTRE[cle]) {
    REGISTRE[cle] = { cle, titre, description, defaut };
  } else {
    REGISTRE[cle].defaut = defaut; // garde la dernière définition du code
  }
}

export function listeAgents(): AgentPrompt[] {
  return Object.values(REGISTRE);
}

export function defautDe(cle: string): string {
  return REGISTRE[cle]?.defaut ?? '';
}

// Clés stables des agents (évite les fautes de frappe).
export const CLE_CADRAGE = 'prompt_cadrage';
export const CLE_CHALLENGE_CADRAGE = 'prompt_challenge_cadrage';
export const CLE_CHALLENGE_PROTO = 'prompt_challenge_prototype';
export const CLE_BANQUE = 'prompt_banque';
