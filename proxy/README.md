# Proxy LLM (Cloudflare Worker)

Garde les clés API **secrètes** côté serveur. L'app web n'embarque alors aucune
clé : elle appelle ce proxy, qui ajoute la clé et relaie vers Groq / Gemini.

## Déploiement (gratuit, ~2 min)

Prérequis : un compte Cloudflare gratuit (https://dash.cloudflare.com/sign-up).

```bash
cd proxy

# 1) Connexion (ouvre le navigateur)
npx wrangler login

# 2) Enregistre tes clés en SECRET (jamais dans le code)
npx wrangler secret put GROQ_API_KEY
#   -> colle ta clé gsk_...
npx wrangler secret put GEMINI_API_KEY      # optionnel (fournisseur de secours)
#   -> colle ta clé Gemini

# 3) Déploie
npx wrangler deploy
```

À la fin, Wrangler affiche l'URL du worker, par ex. :

```
https://myprotos-llm-proxy.<ton-sous-domaine>.workers.dev
```

Copie cette URL : c'est elle qu'on passe à l'app via `EXPO_PUBLIC_LLM_PROXY_URL`
au moment du build. L'app appellera alors `<URL>/groq` et `<URL>/gemini`.

## Sécurité

- Les clés vivent uniquement dans les secrets du Worker (jamais dans le bundle
  public ni dans le repo).
- CORS limité aux origines connues (voir `ALLOW_ORIGINS` dans `worker.js`).
- Pour révoquer l'accès : `npx wrangler secret delete GROQ_API_KEY` ou supprime
  le worker depuis le dashboard Cloudflare.
