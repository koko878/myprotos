# GetExp — Standard technique des applications livrées

> Document de référence **normatif**. Toute application finale produite pour un client
> GetExp DOIT suivre ce standard, sauf dérogation explicite documentée dans le projet.
> Objectif : livrer des apps **fiables, sécurisées et identiques** que le déploiement
> soit **on-premise** (infra du client) ou **chez GetExp** (Azure).

---

## 0. Principe directeur

On ne copie PAS l'architecture massive de Netflix/Uber/Spotify (centaines de
microservices, Kafka, flottes Kubernetes) : c'est calibré pour des millions
d'utilisateurs et des milliers d'ingénieurs. On copie leurs **fondations** :
conteneurisation, base SQL solide, API claire, auth standard, observabilité, CI/CD.

**Architecture cible GetExp : « monolithe modulaire conteneurisé ».**
Simple, robuste, et surtout **portable à l'identique** entre l'infra du client et
Azure — c'est ce qui rend le « plug-and-play » réellement possible.

Règle d'or : **le même artefact Docker tourne chez le client ET chez GetExp.**
Seule la configuration (variables d'environnement) change, jamais le code.

---

## 1. Stack standard

| Couche | Choix par défaut | Notes |
|--------|------------------|-------|
| **Frontend** | **React + TypeScript** (Vite) | SPA web. React Native si app mobile demandée. |
| **Backend (défaut)** | **Node.js + NestJS (TypeScript)** | Pour les apps métier / CRUD / dashboards / back-office. |
| **Backend (variante IA/data)** | **Python + FastAPI** | Si le projet est fortement IA / ML / traitement de documents / NLP / data lourde. |
| **Base de données** | **PostgreSQL** | Standard SQL fiable, présent partout, managé sur Azure. |
| **Cache / files (si besoin)** | **Redis** | Sessions, jobs, rate-limiting. À n'ajouter que si nécessaire. |
| **Stockage fichiers/objets** | **API compatible S3** | **MinIO** en on-premise ↔ **Azure Blob Storage** chez GetExp. Même code. |
| **Auth** | **JWT / OAuth2 / OIDC** | S'intègre au SSO/LDAP/Active Directory du client si requis (capté par l'IA architecte). |
| **Conteneurisation** | **Docker** (obligatoire) | Tout service = une image. `docker-compose` pour l'assemblage. |
| **Reverse proxy / TLS** | **Caddy** ou **Traefik** | TLS automatique, simple à configurer. |
| **Observabilité** | logs JSON structurés + `/health` + métriques | Indispensable pour exploiter (surtout chez GetExp). |
| **CI/CD** | build + test + image Docker | GitHub Actions par défaut. |

### Quand choisir TypeScript vs Python (règle de décision)
- **TypeScript/NestJS par défaut** : gestion, suivi, réservation, CRM, e-commerce,
  back-office, dashboards, workflows métier.
- **Python/FastAPI** UNIQUEMENT si le cœur du projet est : traitement/extraction de
  documents, modèles ML sur-mesure, NLP avancé, pipelines data, calcul scientifique.
- En cas de doute → TypeScript (un seul langage front+back, plus simple à maintenir).
- L'appel à des **LLM** (Groq / Gemini / Azure OpenAI) se fait par API depuis l'un ou
  l'autre backend — ce n'est PAS un motif suffisant pour choisir Python.

---

## 2. Arborescence type d'un projet livré

```
<projet>/
├── docker-compose.yml          # assemble tous les services (plug-and-play)
├── .env.example                # toutes les variables, documentées
├── README.md                   # déploiement client en < 10 lignes
├── Makefile                    # make up / make down / make seed / make logs
├── frontend/                   # React + TypeScript (Vite)
│   ├── Dockerfile
│   └── src/
├── backend/                    # NestJS (TS) OU FastAPI (Python)
│   ├── Dockerfile
│   ├── src/
│   └── migrations/             # migrations SQL versionnées
├── db/
│   └── init/                   # schéma initial + seed de démo
└── deploy/
    ├── on-premise/             # docker-compose + Caddy (TLS) autonome
    └── azure/                  # IaC / instructions Azure (chez GetExp)
```

**Configuration = 100% via variables d'environnement** (`.env`). Aucune valeur
d'infra en dur dans le code. Le `.env.example` liste tout (DB, stockage, auth,
clés). C'est ce fichier qui diffère entre on-premise et Azure.

---

## 3. Cible A — Déploiement ON-PREMISE (infra du client)

L'IA architecte a capté l'infra du client (OS, conteneurisation, BDD existante,
auth/SSO, réseau/proxy/ports, ressources, conformité). Le livrable :

- **Un package `docker-compose` tout-en-un**, autonome, qui démarre par
  `docker compose up -d` et fonctionne du premier coup.
- **S'adapte à l'existant capté** :
  - BDD : si le client a déjà PostgreSQL → on s'y branche (env) ; sinon on embarque un conteneur Postgres.
  - Auth : si SSO/LDAP/AD → connecteur OIDC/LDAP configuré ; sinon auth JWT intégrée.
  - Stockage : MinIO embarqué (compatible S3) sauf stockage objet existant.
  - Réseau : ports/proxy/TLS configurés selon ce qui a été capté.
- **Livrables** : le ZIP (déjà géré par GetExp) + `README` de déploiement + script de
  vérification post-installation (`make check`).
- **Contrainte** : aucune dépendance à un service cloud externe non validé par le client
  (tout doit pouvoir tourner dans son réseau, y compris hors-ligne si exigé).

---

## 4. Cible B — Déploiement CHEZ GETEXP (Azure)

Hébergement et exploitation par GetExp. Le **même artefact Docker** est déployé sur
Azure. Structure recommandée (à détailler projet par projet) :

| Besoin | Service Azure |
|--------|---------------|
| Exécution des conteneurs | **Azure Container Apps** (simple, scalable, serverless) — ou AKS si charge importante |
| Base de données | **Azure Database for PostgreSQL** (Flexible Server) |
| Stockage fichiers/objets | **Azure Blob Storage** (API compatible S3 côté code) |
| Secrets / clés | **Azure Key Vault** |
| Registre d'images | **Azure Container Registry (ACR)** |
| Cache (si besoin) | **Azure Cache for Redis** |
| Nom de domaine + TLS | géré par Container Apps (certificats managés) |
| Supervision | **Azure Monitor / Application Insights** |

Multi-tenant : chaque client GetExp = un namespace/instance isolé (au minimum une
base ou un schéma dédié) pour cloisonner les données.

> La structure Azure détaillée (IaC, coûts, dimensionnement) sera définie avec toi
> projet par projet — ce tableau fixe les briques par défaut.

---

## 5. Sécurité « by design » (intégrée dès la conception)

> Principe : la sécurité n'est PAS une étape finale, elle est intégrée à l'architecture,
> à la stack, au code et au process. **Référentiel par défaut : OWASP ASVS Niveau 2.**
> Toute app GetExp vise ce niveau ; on monte au L3 seulement pour données très sensibles
> (santé, finance critique).

### 5.1 Couche ARCHITECTURE
- **Threat modeling léger** au cadrage technique : lister les données sensibles, qui accède
  à quoi, les menaces principales (méthode STRIDE simplifiée), et la parade pour chacune.
- **Défense en profondeur** : plusieurs barrières (réseau → application → données). Jamais
  un rempart unique.
- **Isolation / cloisonnement** : 1 client = données isolées (base ou schéma dédié). Le
  réseau interne n'expose que le strict nécessaire ; pas de service de données exposé à Internet.
- **Zero-trust** : tout appel (même interne) est authentifié ET autorisé. Aucune confiance implicite.
- **Surface minimale** : on n'installe/n'ouvre/n'expose que ce qui est utilisé.

### 5.2 Couche STACK (secure defaults)
- Briques éprouvées uniquement (PostgreSQL, NestJS/FastAPI, Caddy/Traefik). Pas de techno exotique.
- L'état SÛR est l'état PAR DÉFAUT : HTTPS/TLS forcé, cookies `httpOnly`+`Secure`+`SameSite`,
  CORS restrictif (liste blanche), en-têtes de sécurité (CSP, HSTS, X-Content-Type-Options) actifs d'origine.
- Dépendances épinglées (lockfile), images Docker de base minimales et à jour.

### 5.3 Couche CODE (OWASP)
Grille = **OWASP Top 10 + ASVS L2** :
- **Validation stricte des entrées** côté serveur (schémas typés), sortie échappée (anti-XSS).
- **Requêtes paramétrées / ORM** systématiques (anti-injection SQL).
- **AuthN** : mots de passe hashés (argon2/bcrypt), tokens courts + refresh, rotation, verrouillage anti-brute-force.
- **AuthZ vérifiée à CHAQUE endpoint** (contrôle d'accès objet par objet — anti-IDOR). Refus par défaut.
- **Gestion d'erreurs « fail securely »** : en cas de doute, on refuse ; les messages d'erreur ne fuient aucune info technique.
- **Secrets hors code** (`.env`/Key Vault), jamais de secret en dur ni dans les logs.
- **Logs de sécurité** (connexions, accès refusés, actions sensibles) sans données personnelles en clair.
- **Rate-limiting** sur les endpoints sensibles (login, API publiques).

### 5.4 Couche PROCESS (automatisé dans la CI)
- À chaque commit/PR, la CI exécute :
  - **scan de dépendances vulnérables** (`npm audit` / `pip-audit`),
  - **scan de secrets** (gitleaks) — bloque tout secret commité,
  - **analyse statique SAST** (CodeQL / Semgrep),
  - lint + tests.
- **Une alerte de sécurité bloque le merge.**
- **Sauvegardes BDD automatiques** + chiffrement au repos (Azure) + journalisation.

### 5.5 Porte de certification (avant toute mise en prod)
Aucune app ne part en production sans la **certification sécurité GetExp** : audit de la
checklist ASVS L2, revue du threat model, vérification des scans CI au vert. C'est l'étape
finale du parcours client — elle ATTESTE que les points ci-dessus sont réellement respectés.

---

## 6. Gestion du code & des versions (apps clients)

### Organisation des dépôts
- **1 repo Git PRIVÉ par application client**, regroupés dans une **organisation GitHub
  « GetExp »** (séparée du compte perso). Jamais public (code propriétaire client).
- Convention de nommage : `getexp/app-<slug-client>-<slug-projet>`
  (ex. `getexp/app-institut-beaute-rdv`).
- Description du repo = nom du client + référence du bon de commande (ex. `GETX-AB12CD`).
- Le **README** rappelle : client, cible de déploiement (on-premise/Azure), date de livraison.

### Workflow Git (simple et robuste)
- Branche `main` = code stable, toujours déployable. **Protégée** (pas de push direct).
- Une branche par évolution : `feat/...`, `fix/...` → **Pull Request** → revue → merge dans `main`.
- Commits clairs et atomiques (convention : `feat:`, `fix:`, `chore:`, `docs:`).
- Génération initiale (Claude Code à partir du package ZIP) = **premier commit** sur une
  branche `init`, puis PR vers `main` après vérification.

### Versionnement (SemVer) & releases
- Versions **SemVer** : `vMAJEUR.MINEUR.CORRECTIF` (ex. `v1.0.0` = première livraison client).
  - MAJEUR = changement cassant, MINEUR = nouvelle fonctionnalité, CORRECTIF = bugfix.
- Chaque livraison client = un **tag Git** + une **GitHub Release** (notes de version =
  ce qui change pour le client).
- L'**image Docker** est taguée avec la même version (`app:1.0.0`) et poussée sur l'ACR
  (chez GetExp) — l'image déployée correspond donc exactement à un commit/tag traçable.

### Historisation & traçabilité
- Tout est dans Git : historique complet, qui a changé quoi et quand.
- Les **migrations DB versionnées** (cf. §2) suivent le code → l'état de la base est
  reproductible à n'importe quelle version.
- Les **secrets ne sont jamais commités** (`.env` hors git, cf. §5) — uniquement
  `.env.example`. Les vrais secrets vivent dans Key Vault (Azure) ou chez le client.

### CI/CD par repo
- GitHub Actions : à chaque PR → build + tests ; sur tag `v*` → build image Docker +
  push ACR (+ déploiement Azure si client hébergé GetExp).
- Une CI rouge bloque le merge.

### Livraison du code au client (on-premise)
- Le client reçoit le **package de déploiement** (ZIP docker-compose), pas forcément
  l'accès au repo. Si le contrat prévoit la cession du code source → on lui donne accès
  au repo en lecture, ou un export tagué de la version livrée.

---

## 7. Définition de « Terminé » pour une app livrée

- [ ] `docker compose up` démarre l'app complète sans intervention manuelle.
- [ ] `.env.example` documente 100% de la configuration.
- [ ] Migrations DB versionnées + seed de démonstration.
- [ ] Endpoint `/health` et logs structurés.
- [ ] README : déploiement client en moins de 10 lignes.
- [ ] Tests automatisés du parcours principal + CI verte.
- [ ] Le même artefact tourne on-premise ET sur Azure (config seule diffère).
