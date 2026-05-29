# GetExp — Backend de génération de prototypes (Claude agentique)

Génère les prototypes HTML via une **boucle agentique Claude** (outils fichiers +
bash dans un workspace isolé), exactement le mécanisme de Claude Code : l'agent
écrit `index.html`, l'inspecte, le corrige, puis on renvoie le fichier.

La clé `ANTHROPIC_API_KEY` reste **secrète côté serveur** — elle n'est jamais
embarquée dans l'application.

## Lancer en local

```bash
cd backend
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start
# -> http://localhost:8787
```

Test :

```bash
curl http://localhost:8787/health
```

## Déploiement (au choix)

N'importe quel hébergeur Node qui accepte des clés secrètes et des requêtes
longues (la génération prend 30 s à 2 min) :

- **Render / Railway / Fly.io / VPS** : `npm start`, variable d'env `ANTHROPIC_API_KEY`.
- Évite les plateformes à timeout court (< 60 s) pour `/generate`.

Configure ensuite l'app avec l'URL du backend :

```bash
EXPO_PUBLIC_BACKEND_URL=https://<ton-backend> npx expo export -p web
```

## Endpoints

| Méthode | Chemin | Rôle |
|---|---|---|
| GET | `/health` | Diagnostic (serveur vivant + clé configurée) |
| POST | `/generate` | Corps `{ useCase }` → `{ html, journal }` |

## Modèle

`claude-opus-4-8` par défaut (surchargeable via `ANTHROPIC_MODEL`).
