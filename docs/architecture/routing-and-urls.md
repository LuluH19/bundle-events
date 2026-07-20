# Architecture — Routing & URLs

[← Sommaire](../README.md)

Tout est piloté par l'URL ; un seul composant client (`BundleBuilder`) est rendu par toutes les pages avec une prop `step`.

## Pages

- `src/app/page.tsx` → `/` → `<BundleBuilder step="home" />` (sans uuid).
- `src/app/[uuid]/[[...step]]/page.tsx` → `/{uuid}/{step?}` (catch-all optionnel) :
  - vide → `home`
  - `hotels` | `routes-outbound` | `routes-return` | `bundle`
  - autre → `notFound()`
  - `params` est `await`é (params asynchrones Next 16).

## Étapes (`src/types/step.ts`, `STEPS`)

| # | id | label |
|---|---|---|
| 01 | `home` | Trajet |
| 02 | `hotels` | Hôtels |
| 03 | `routes-outbound` | Aller |
| 04 | `routes-return` | Retour |
| 05 | `bundle` | Bundle |

## Navigation

`go(step)` fait `router.push(pathFor(step))` → **chaque changement d'étape est un changement de route** : `BundleBuilder` est démonté/remonté et réhydrate depuis Supabase.

L'uuid est créé à la transition **home → hotels** (`handleCompose` → `createBundle` → `router.push('/{id}/hotels')`), donc un uuid existe pendant quasiment tout le parcours.

## Gating (`canReach` / `stepComplete`)

Une étape n'est atteignable via l'aside/tabbar que si **toutes** les précédentes sont complètes :

- `home` = départ + venue
- `hotels` = `selectedHotel` non nul
- `routes-outbound` = un aller sélectionné
- `routes-return` = `!roundTrip` ou un retour sélectionné (étape ignorée en aller simple)
- `bundle` = terminal

> Conséquence : si `selectedHotel` est perdu (mauvaise persistance), les étapes Aller/Retour deviennent injoignables. Voir [État & persistance](./state-and-persistence.md).
