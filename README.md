# protos — marketplace tech / data / IA

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

## Intégration d'une IA réelle

Le moteur de cadrage fonctionne 100 % hors-ligne (mode prototype). Pour brancher
un LLM, implémenter `maybeCallLLM` dans `src/cadrageAssistant.ts`. Plusieurs
fournisseurs proposent un palier gratuit (voir discussion projet).
