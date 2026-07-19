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
- `src/services/travel.integration.test.ts` — intégration service transport.
- `e2e/home-flow.spec.ts` — parcours home (Playwright).
- Runners : Vitest (`vitest.config.ts`), Playwright (`playwright.config.ts`).

## Config racine

`package.json`, `tsconfig.json` (ES2017, strict, alias `@/*`), `next.config.ts` (images `static.cupid.travel/hotels/**`), `postcss.config.mjs` (Tailwind v4), `eslint.config.mjs` (flat, extends next), `vitest.config.ts`, `playwright.config.ts`, `.commitlintrc.json`.
