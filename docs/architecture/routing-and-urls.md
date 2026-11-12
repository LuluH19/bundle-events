# Architecture — Routing & URLs

[← Sommaire](../README.md)

Tout est piloté par l'URL ; un seul composant client (`BundleBuilder`) est rendu par toutes les pages avec une prop `step`.

## Pages

- `src/app/page.tsx` → `/` → `<BundleBuilder step="home" />` (sans uuid).
- `src/app/[uuid]/[[...step]]/page.tsx` → `/{uuid}/{segment?}` (catch-all optionnel) :
  - vide → `home` (modifier la recherche d'un bundle existant)
  - `voyage` → `trip`
  - `reserver` → `book`
  - anciens segments, redirigés (307) pour que les liens déjà partagés marchent : `hotels`, `routes-outbound`, `routes-return` → `voyage` ; `bundle` → `reserver`
  - autre → `notFound()`
  - `params` est `await`é (params asynchrones Next 16).

## Étapes (`src/types/step.ts`, `STEPS`)

| id | label | segment |
|---|---|---|
| `home` | Recherche | (aucun) |
| `trip` | Ton voyage | `voyage` |
| `book` | Réserver | `reserver` |

## Navigation

`go(step)` met l'état en cache (`writeTripCache`), sauvegarde le snapshot en arrière-plan puis fait `router.push(pathFor(step))` → chaque changement d'étape est un changement de route : `BundleBuilder` est démonté/remonté et se réhydrate depuis le cache mémoire (sinon depuis Supabase).

L'uuid est créé au clic sur « Voir mon voyage » (`handleCompose` → `createBundle` → `router.push('/{id}/voyage')`).

## Progression

Plus de gating par étape : « Ton voyage » est toujours complet (choix automatiques). Les indicateurs `StepsInline` / `StepsColumn` (`components/trip/Steps.tsx`) ne rendent cliquables que les étapes passées. Si l'on ouvre `voyage` ou `reserver` sans départ ni événement, la page propose de commencer une recherche.
