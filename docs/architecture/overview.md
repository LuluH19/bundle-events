# Architecture — Vue d'ensemble

[← Sommaire](../README.md)

## Couches

```
src/
├── adapters/   # mapping payload API externe → types internes
├── app/        # routing Next.js (pages + api/ route handlers)
├── components/ # présentation (UI)
│   ├── views/  # écrans de chaque étape
│   └── layout/ # Header, SideNav, MobileTabBar
├── config/     # configurations d'APIs + variables d'env
├── lib/        # clients tiers (supabase, email)
├── services/   # couche de récupération de données (appelée par le client)
├── styles/     # thème + globals (Tailwind v4)
├── types/      # définitions TypeScript (barrel dans index.ts)
└── utils/      # logique
    ├── algorithms/ # math/logique pure (routing, geodesic)
    └── constants/  # datasets statiques (airports, venues, bus-stations)
```

> ⚠️ `AGENTS.md` mentionne `src/hooks/` : **ce dossier n'existe pas**. Aucun hook personnalisé — toute la logique à état vit dans `src/components/BundleBuilder.tsx` avec les hooks React natifs.

## Flux de données

```
BundleBuilder (client)
  → services/*.ts (fetch vers /api/*)
    → app/api/*/route.ts (serveur)
      → adapters/*.ts (mapping)
        → API externe (LiteAPI, SNCF, Mapbox, …)
```

Le composant **`BundleBuilder.tsx`** est l'orchestrateur central : il détient tout l'état, hydrate depuis Supabase, persiste, et rend l'écran de l'étape courante.

## Mesure d'audience

PostHog est initialisé côté navigateur dans `src/instrumentation-client.ts`, avant l'hydratation React, via `posthog-js`. Les deux [variables PostHog](../getting-started/environment.md) doivent être renseignées pour activer la collecte. Les pages vues sont capturées au chargement et lors des changements d'historique (navigation App Router), avec l'autocapture du SDK. L'intégration suit le [guide Next.js de PostHog](https://posthog.com/docs/libraries/next-js), avec les defaults datés `2026-05-30`. Aucun appel `identify` ni événement métier personnalisé n'est ajouté.

Le layout racine `src/app/layout.tsx` inclut le composant `Analytics` de `@vercel/analytics/next` pour mesurer les visiteurs et les pages vues sur l'ensemble des routes avec Vercel Web Analytics.

## Pour aller plus loin

- [Routing & URLs](./routing-and-urls.md) — modèle d'URL, étapes, gating.
- [État & persistance](./state-and-persistence.md) — snapshot, hydratation, sauvegarde.
- [Types](../../src/types/index.ts) — barrel des définitions TypeScript.
