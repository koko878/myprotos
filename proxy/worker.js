// Proxy LLM — Cloudflare Worker (gratuit).
//
// Rôle : garder les clés API SECRÈTES côté serveur. L'app web appelle ce proxy,
// le proxy ajoute la clé et relaie vers Groq (ou Gemini). Ainsi aucune clé
// n'est embarquée dans le bundle public de l'application.
//
// Secrets attendus (dashboard → Settings → Variables and Secrets, type Secret) :
//   GROQ_API_KEY     (obligatoire pour Groq)
//   GEMINI_API_KEY   (optionnel, fournisseur de secours)
//
// Endpoints :
//   GET  /health  -> diagnostic : worker vivant + quels secrets sont configurés
//   POST /groq    -> relaie vers l'API chat completions de Groq
//   POST /gemini  -> relaie vers generateContent de Gemini (modèle dans ?model=)

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const ALLOW_ORIGINS = [
  'https://koko878.github.io',
  'http://localhost:9095',
  'http://localhost:9096',
  'http://localhost:8081',
];

function corsHeaders(origin) {
  const autorise = ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': autorise,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });

    // --- Diagnostic (ouvrable dans le navigateur) -------------------------
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({
        ok: true,
        worker: 'myprotos-llm-proxy',
        groqKeyConfigured: !!env.GROQ_API_KEY,
        geminiKeyConfigured: !!env.GEMINI_API_KEY,
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: cors });
    }

    try {
      const body = await request.json();

      // --- Groq -------------------------------------------------------------
      if (url.pathname === '/groq') {
        if (!env.GROQ_API_KEY) return json({ error: 'GROQ_API_KEY non configurée' }, 500);
        const r = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
          },
          body: JSON.stringify(body),
        });
        const data = await r.text();
        return new Response(data, {
          status: r.status,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      // --- Gemini (secours) -------------------------------------------------
      if (url.pathname === '/gemini') {
        if (!env.GEMINI_API_KEY) return json({ error: 'GEMINI_API_KEY non configurée' }, 500);
        const model = url.searchParams.get('model') || 'gemini-2.5-flash';
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        const data = await r.text();
        return new Response(data, {
          status: r.status,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  },
};
