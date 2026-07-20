# Design system

[← Sommaire](../README.md)

## Thème (`src/styles/theme.css`)

Bloc `@theme` de Tailwind v4.

### Polices
- **Inter** — sans (`--font-inter`), texte courant.
- **Allan** — display (`--font-allan`), titres éditoriaux. Chargées dans `src/app/layout.tsx`.

### Palette

| Token | Hex | Usage |
|---|---|---|
| `ink` | `#00113a` | texte foncé + panneaux sombres |
| `navy` | `#0e3c60` | fonds héros (+ `navy-700` `#002366`, `navy-500` `#00497d`) |
| `ember` | `#f96c1a` | orange de marque (+ `ember-600` `#ea580c`, `ember-700` `#d35400`) |
| `ember-ink` | `#9f4200` | orange en texte sur fond clair |
| `ember-soft` | `#ffdbcb` | fond de chip orange clair |
| `page` | `#f9f9fb` | fond de page |
| `mist` | `#f3f3f5` | fond secondaire |
| `cloud` | `#f8fafc` | fond tertiaire |
| `line` | `#e2e8f0` | bordures |
| `slate-*` | 400/500/600 | textes gris |

`--radius-card: 16px`.

## Globals (`src/styles/globals.css`)

- `@import "tailwindcss"` + `./theme.css`.
- `.font-display` (Allan), `.eyebrow` (label uppercase 12px, `letter-spacing: 0.12em`).
- `.scroll-slim` (scrollbar fine), `.no-scrollbar` (scrollbar masquée).
- Restyle des popups Mapbox (`.mapboxgl-popup-content`).

## Composants UI (`src/components/ui.tsx`)

- **Icônes** (SVG stroke, `currentColor`) : `IconArrow, IconPin, IconBookmark, IconCopy, IconShare, IconTrain, IconPlane, IconCar, IconBus, IconWalk, IconStar, IconLeaf, IconWifi, IconCheck, IconClose, IconSearch, IconMap, IconBed, IconBag, IconSparkle, IconTicket`.
- **`MODE_ICON`** : map `TransportMode → icône`.
- **Primitives** : `Eyebrow`, `Chip`, `Button` (variantes `primary` ember / `dark` ink / `ghost`).

## Signature & responsive

- Titre display extrabold : « Votre escapade, **assemblée.** » (« assemblée. » en `ember`). Repris dans l'email ([../features/save-and-email.md](../features/save-and-email.md)).
- La modale de détail hôtel ([../features/hotels.md](../features/hotels.md)) est une **bottom-sheet** ancrée en bas (mobile & PC) ; sur PC layout deux colonnes (image gauche / contenu droite).
- Cartes chargées en `next/dynamic` (`ssr:false`).

Source of truth : maquettes Stitch (voir mémoire projet).
