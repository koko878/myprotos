// Serveur iasser — expose la génération de prototype par l'agent Claude.
//
// La clé ANTHROPIC_API_KEY reste SECRÈTE côté serveur (jamais dans l'app).
//
// Endpoints :
//   GET  /health   -> diagnostic (serveur vivant + clé configurée)
//   POST /generate -> { useCase } => { html } (boucle agentique façon Claude Code)

const express = require('express');
const cors = require('cors');
const { genererPrototype, MODELE, EFFORT } = require('./agent');

const app = express();
app.use(express.json({ limit: '1mb' }));

// CORS : autorise la page déployée + localhost de dev.
const ORIGINES = [
  'https://koko878.github.io',
  'http://localhost:9095',
  'http://localhost:9096',
  'http://localhost:8081',
];
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || ORIGINES.includes(origin)),
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'getexp-backend',
    anthropicKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
    model: MODELE, // modèle Claude réellement utilisé
    effort: EFFORT, // profondeur de raisonnement (xhigh recommandé pour le code)
  });
});

// Vérifie que le modèle configuré existe vraiment et expose ses capacités
// (fenêtre de contexte, sortie max). Permet de confirmer "la meilleure version".
app.get('/model', async (_req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée.' });
  }
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic();
    const m = await client.models.retrieve(MODELE);
    res.json({
      requested: MODELE,
      resolved: m.id,
      display_name: m.display_name,
      max_input_tokens: m.max_input_tokens,
      max_tokens: m.max_tokens,
      effort: EFFORT,
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e), requested: MODELE });
  }
});

app.post('/generate', async (req, res) => {
  const uc = req.body && req.body.useCase;
  if (!uc || typeof uc !== 'object' || !uc.titre) {
    return res.status(400).json({ error: 'useCase manquant ou invalide.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurée côté serveur.' });
  }
  try {
    const { html, journal } = await genererPrototype(uc);
    res.json({ html, journal });
  } catch (e) {
    console.error('Génération échouée :', e);
    res.status(500).json({ error: 'Génération échouée : ' + String(e.message || e) });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`iasser backend à l'écoute sur :${PORT}`);
});
