# iasser — marketplace tech / data / IA

Prototype mobile (Expo / React Native) d'une marketplace qui met en relation des
**demandeurs** (chefs de projet, métiers) et des **experts data/IA anonymes**.

## Le principe

1. **Cadrage IA** — Un demandeur exprime une idée floue. Un assistant IA la
   transforme, par quelques questions, en un *use case structuré* (objectif,
   KPIs, données, complexité, budget indicatif).
2. **Publication** — Le use case est listé ; des experts anonymes peuvent
   choisir de se positionner.
3. **Prototype d'abord** — Un expert propose un prototype. S'il est validé par
   le client…
4. **Livraison clé en main** — …l'expert livre le projet complet.

Le différenciateur : on **dérisque le projet avant la mise en relation** grâce au
cadrage IA, et le modèle *POC-first* sécurise le client.

## Modèle économique (piste)

- **Commission** (15–20 %) sur les missions conclues via la plateforme.
- **Escrow** : paiement séquestré, libéré par jalon (prototype → solde). Résout à
  la fois la confiance, l'anonymat et le contournement de la plateforme.
- À maturité : abonnement B2B (cadrage IA + vivier d'experts vérifiés) et
  crédits IA premium.

## Périmètre de ce MVP

Côté **demandeur + cadrage IA** uniquement :
`Accueil → Cadrage conversationnel → Récapitulatif → Publication → Liste/Détail`.
Le cycle de vie complet (prototype, validation, livraison) est jouable en démo
dans l'écran détail.

## Stack

- Expo SDK 56 / React Native 0.85 / TypeScript
- Navigation maison légère (`src/navigation.tsx`), sans dépendance externe
- Persistance locale via AsyncStorage (`src/storage.ts`)
- Assistant de cadrage : moteur heuristique local (`src/cadrageAssistant.ts`),
  avec un adaptateur `maybeCallLLM` prêt à brancher sur un vrai LLM.

## Lancer

```bash
npm install
npm run start   # puis 'a' (Android), 'i' (iOS), 'w' (web)
```

## Intégration IA — Google Gemini (gratuit)

Le moteur de cadrage fonctionne 100 % hors-ligne (heuristique locale). Pour
activer une vraie IA sur la **synthèse du use case** (reformulation, KPIs,
approche, complexité, budget) :

1. Récupérer une clé gratuite sur https://aistudio.google.com/apikey
2. `cp .env.example .env` puis renseigner `EXPO_PUBLIC_GEMINI_API_KEY`
3. Relancer `npm run start`

Sans clé, l'app retombe automatiquement sur le moteur local — aucune
régression. Le branchement est dans `src/llm.ts` (appel Gemini) et
`synthetiserUseCaseIA` dans `src/cadrageAssistant.ts`.

> ⚠️ La clé `EXPO_PUBLIC_*` est embarquée côté client (OK pour un prototype).
> En production, router les appels via un backend proxy pour ne jamais exposer
> la clé dans le binaire mobile.
