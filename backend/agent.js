// Boucle agentique Claude — façon Claude Code.
//
// L'agent dispose d'outils fichiers + bash dans un workspace isolé par job. Il
// construit un prototype web auto-porté (un seul index.html), peut l'inspecter
// et le corriger, puis on renvoie le fichier produit.
//
// Modèle : claude-opus-4-8, effort xhigh (recommandé pour le code agentique).

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic(); // lit ANTHROPIC_API_KEY

const MODELE = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
// Effort = profondeur de raisonnement/agentivité. "xhigh" est le réglage
// recommandé pour le code sur Opus 4.8 (et le défaut de Claude Code).
const EFFORT = process.env.ANTHROPIC_EFFORT || 'xhigh';

// --- Définition des outils (côté client, exécutés dans le workspace) ---------

const TOOLS = [
  {
    name: 'write_file',
    description:
      'Crée ou écrase un fichier dans le workspace. Utilise des chemins relatifs (ex: "index.html").',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Chemin relatif du fichier' },
        content: { type: 'string', description: 'Contenu complet du fichier' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Lit le contenu d’un fichier du workspace (chemin relatif).',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'list_files',
    description: 'Liste les fichiers du workspace.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'bash',
    description:
      'Exécute une commande shell dans le workspace (ex: "ls", "wc -c index.html", "grep -c script index.html"). Pas d’accès réseau.',
    input_schema: {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command'],
    },
  },
];

// Empêche toute évasion du workspace (path traversal).
function cheminSur(workspace, rel) {
  const p = path.resolve(workspace, rel);
  if (p !== workspace && !p.startsWith(workspace + path.sep)) {
    throw new Error('Chemin hors workspace refusé : ' + rel);
  }
  return p;
}

function executerOutil(workspace, nom, input) {
  switch (nom) {
    case 'write_file': {
      const p = cheminSur(workspace, input.path);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, String(input.content ?? ''));
      return `Écrit ${input.path} (${Buffer.byteLength(String(input.content ?? ''))} octets).`;
    }
    case 'read_file': {
      const p = cheminSur(workspace, input.path);
      if (!fs.existsSync(p)) return `Fichier introuvable : ${input.path}`;
      return fs.readFileSync(p, 'utf8').slice(0, 100000);
    }
    case 'list_files': {
      const out = execSync('find . -type f -not -path "./node_modules/*"', {
        cwd: workspace,
      }).toString();
      return out || '(workspace vide)';
    }
    case 'bash': {
      try {
        const out = execSync(input.command, {
          cwd: workspace,
          timeout: 15000,
          stdio: ['ignore', 'pipe', 'pipe'],
        }).toString();
        return out.slice(0, 20000) || '(pas de sortie)';
      } catch (e) {
        return `Erreur (code ${e.status ?? '?'}) : ${String(e.stderr || e.message).slice(0, 4000)}`;
      }
    }
    default:
      return `Outil inconnu : ${nom}`;
  }
}

const SYSTEM = `Tu es un designer-développeur front-end de très haut niveau (niveau studio primé). Tu construis des PROTOTYPES web de démonstration, façon agent autonome.

Objectif : produire un fichier \`index.html\` AUTO-PORTÉ, visuellement BLUFFANT et interactif, qui démontre le produit décrit.

Contraintes techniques sur index.html :
- UN SEUL fichier index.html (HTML + CSS + JS). Les ressources externes via CDN sont AUTORISÉES et ENCOURAGÉES pour la qualité visuelle : polices Google Fonts, icônes (Lucide, Heroicons, Font Awesome), Tailwind CDN, libs d'animation (AOS, Animate.css), graphiques (Chart.js), etc.
- INTERDIT : appeler une API métier/back-end réelle. Toutes les DONNÉES restent en dur dans le JS (jeu d'exemple réaliste). Les CDN ne servent qu'aux polices/icônes/libs d'UI.
- Responsive (mobile d'abord), accessible, sans erreur console.
- Interactions réelles : navigation entre vues, filtres, formulaires, états, affichage de résultats. Contenu métier crédible, jamais de Lorem ipsum.

EXIGENCES DE DESIGN (vise un rendu "wow", niveau studio primé) :
- BANNIS l'esthétique "IA générique" : pas de police système par défaut (Arial/Roboto/Inter brut), pas de dégradé violet sur fond blanc, pas de layout cookie-cutter.
- Typographie expressive via Google Fonts (choisis une combinaison adaptée au secteur : ex. une display character + une sans lisible). Hiérarchie nette (display, h1, body, caption), letter-spacing et graisses travaillés.
- Palette cohérente et affirmée, déduite du métier du client (évite le bleu corporate par défaut). Variables CSS (couleurs, rayons, ombres, espacements) et discipline.
- Vraies icônes (lib d'icônes, pas d'emoji en guise d'icônes d'UI).
- Détails qui font la différence : grille et espacements réguliers (échelle 4/8px), ombres douces multi-couches, états hover/focus, transitions et micro-animations (apparition au scroll, feedback au clic), éventuellement un graphique si pertinent.
- Compose un vrai produit : en-tête, navigation, sections rythmées, cartes, tableaux/listes lisibles, empty states. Pense "produit fini", pas "maquette".
- Soigne le mobile autant que le desktop.

Méthode de travail (itère pour la qualité) :
1. Écris index.html avec write_file.
2. VÉRIFIE : relis le fichier (read_file) ; avec bash, contrôle la présence des sections clés et la taille. Vérifie qu'aucune URL ne pointe vers une API métier (seuls polices/icônes/libs CDN sont admis).
3. Fais AU MOINS UNE passe d'amélioration visuelle : relis ton rendu d'un œil critique de designer et renforce la hiérarchie, les espacements, la palette, les animations.
4. Quand le prototype est soigné, cohérent et vérifié, réponds UNIQUEMENT avec le texte: PROTOTYPE_READY

Ne demande jamais de précision : prends des décisions de design fortes et avance.`;

function prompt(uc) {
  const spec = uc.spec || {};
  const remarques = (uc.remarques || []).map((r) => (typeof r === 'string' ? r : r.texte)).filter(Boolean);
  const blocRemarques = remarques.length
    ? `\n\nREMARQUES DU CLIENT À INTÉGRER EN PRIORITÉ (nouvelle version) :\n${remarques.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    : '';
  return `Construis le prototype index.html pour ce projet :

TITRE : ${uc.titre}
DOMAINE : ${uc.domaine}
PROBLÈME : ${uc.probleme}
OBJECTIF : ${uc.objectif}
UTILISATEURS : ${uc.utilisateurs}
APPROCHE : ${uc.approcheSuggeree}
KPIS : ${(uc.kpis || []).join(', ')}
${(uc.langues || []).length ? `LANGUES DE L'INTERFACE : ${uc.langues.join(', ')} (prévois un sélecteur de langue si plusieurs)` : ''}
${spec.resume ? `RÉSUMÉ : ${spec.resume}` : ''}
${spec.fonctionnalites ? `FONCTIONNALITÉS : ${spec.fonctionnalites.join(' ; ')}` : ''}
${spec.donneesEntree ? `DONNÉES : ${spec.donneesEntree}` : ''}${blocRemarques}

Commence maintenant.`;
}

/**
 * Lance la boucle agentique pour un use case. Renvoie { html, journal } ou
 * lève une exception. `onEtape` (optionnel) reçoit des libellés de progression.
 */
async function genererPrototype(uc, onEtape = () => {}) {
  const workspace = fs.mkdtempSync(path.join(require('os').tmpdir(), 'getexp-'));
  const journal = [];
  const log = (m) => {
    journal.push(m);
    onEtape(m);
  };

  try {
    const messages = [{ role: 'user', content: prompt(uc) }];
    const MAX_TOURS = 20;

    for (let tour = 0; tour < MAX_TOURS; tour++) {
      // Streaming OBLIGATOIRE : avec un gros max_tokens + raisonnement, le SDK
      // exige le streaming (sinon "Streaming is required..."). On agrège le
      // message final via .finalMessage().
      const stream = client.messages.stream({
        model: MODELE,
        max_tokens: 48000,
        // Adaptive thinking + effort élevé : meilleure qualité de code agentique.
        thinking: { type: 'adaptive' },
        output_config: { effort: EFFORT },
        system: SYSTEM,
        tools: TOOLS,
        messages,
      });
      const reponse = await stream.finalMessage();

      messages.push({ role: 'assistant', content: reponse.content });

      // Texte éventuel de l'assistant
      const textes = reponse.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
      if (textes) log('💬 ' + textes.slice(0, 120));

      const toolUses = reponse.content.filter((b) => b.type === 'tool_use');

      // Fin : l'agent a signalé que le prototype est prêt.
      if (reponse.stop_reason === 'end_turn' || textes.includes('PROTOTYPE_READY')) {
        if (toolUses.length === 0) break;
      }

      if (toolUses.length === 0) {
        // Pas d'outil et pas fini : on pousse à conclure.
        if (reponse.stop_reason === 'end_turn') break;
        continue;
      }

      const results = [];
      for (const tu of toolUses) {
        log(`🔧 ${tu.name}${tu.input?.path ? ' ' + tu.input.path : ''}${tu.input?.command ? ' ' + tu.input.command : ''}`);
        let out;
        try {
          out = executerOutil(workspace, tu.name, tu.input);
        } catch (e) {
          out = 'Erreur : ' + String(e.message);
        }
        results.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: String(out),
        });
      }
      messages.push({ role: 'user', content: results });
    }

    const indexPath = path.join(workspace, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error("L'agent n'a pas produit de fichier index.html.");
    }
    const html = fs.readFileSync(indexPath, 'utf8');
    log('✅ Prototype généré (' + Buffer.byteLength(html) + ' octets).');
    return { html, journal };
  } finally {
    // Nettoyage du workspace.
    try {
      fs.rmSync(workspace, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

module.exports = { genererPrototype, MODELE, EFFORT };
