# Conventions & contribution

[← Sommaire](../README.md)

## Code

- **Pas de commentaires dans le code** — code auto-explicatif via le nommage. Ne garder que les directives fonctionnelles nécessaires (`eslint-disable-next-line`, placeholder `/* empty */` dans un `catch` volontairement vide).
- **Alias d'import** `@/*` → racine (`@/src/...`).
- **Qualité** : `npm run typecheck` et `npm run lint` doivent passer (0 erreur). Quelques warnings React `set-state-in-effect` préexistants sont tolérés.
- **Persistance + navigation** : toute action qui sélectionne quelque chose **puis navigue dans le même clic** doit persister la valeur explicitement avant `router.push`. Voir [../architecture/state-and-persistence.md](../architecture/state-and-persistence.md).

## Documentation

- **Maintenir `docs/`** — mettre à jour le(s) fichier(s) concerné(s) dans le **même changement** que toute modification de comportement, structure, API, variable d'env, feature ou convention. La doc fait partie du « terminé ».

## Commits

- `commitlint` (`.commitlintrc.json`) → format conventionnel (`feat:`, `fix:`, `chore:`, `style:`, …).

## Tests

- `src/__tests__/geodesic.test.ts` + `e2e/geodesic.test.ts` — math géodésique.
- `src/utils/date.test.ts` — bornes datetime-local (passé / retour après aller).
- `src/__tests__/date.test.ts`, `recommend.test.ts`, `trip.test.ts`, `format.test.ts` — recherche par date, choix auto, résumé du voyage, formatage des durées.
- `src/services/travel.integration.test.ts` — intégration service transport.
- `src/__tests__/fallback.test.ts`, `providers.test.ts`, `bus-connection.test.ts`, `bus-network.test.ts` — chaînes de secours, mapping Ticketmaster / API Adresse, liaison en car, construction du réseau GTFS.
- Données : `npm run gtfs:sync` régénère `src/utils/constants/bus-network.json` (horaires des cars).
- `e2e/home-flow.spec.ts` — parcours home (Playwright).
- Runners : Vitest (`vitest.config.ts`, couverture v8), Playwright (`playwright.config.ts`, `E2E_PROD=1` pour tester le build de production).

## Config racine

`package.json`, `tsconfig.json` (ES2017, strict, alias `@/*`), `next.config.ts` (images `static.cupid.travel/hotels/**`), `postcss.config.mjs` (Tailwind v4), `eslint.config.mjs` (flat, extends next), `vitest.config.ts`, `playwright.config.ts`, `lighthouserc.json` (Lighthouse CI), `.commitlintrc.json`.
