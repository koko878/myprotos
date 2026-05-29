// Serveur GetExp — expose la génération de prototype par l'agent Claude.
//
// La clé ANTHROPIC_API_KEY reste SECRÈTE côté serveur (jamais dans l'app).
//
// Endpoints :
//   GET  /health   -> diagnostic (serveur vivant + clé configurée)
//   POST /generate -> { useCase } => { html } (boucle agentique façon Claude Code)

const express = require('express');
const cors = require('cors');
const { genererPrototype } = require('./agent');

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
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
  });
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
  console.log(`GetExp backend à l'écoute sur :${PORT}`);
});
