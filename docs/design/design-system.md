# Design system

[← Sommaire](../README.md)

Charte « Nuit de concert, billet rouge » : un bleu nuit pour les fonds et le texte, un seul rouge réservé à l'action principale, des couleurs par mode de transport distinctes de la marque. Rien d'autre ne cherche à attirer l'œil. Le logo reste celui du projet (`public/favicon/favicon.svg`).

## Thème (`src/styles/theme.css`)

Bloc `@theme` de Tailwind v4.

### Polices (chargées dans `src/app/layout.tsx` via `next/font/google`)
- **Bricolage Grotesque** — display (`--font-bricolage`, classe `font-display`), titres uniquement.
- **Figtree** — sans (`--font-figtree`), texte courant, base 16 px.
- **JetBrains Mono** — mono (`--font-jetbrains`, classe `font-mono`), horaires et codes.

### Couleurs de marque

| Token | Hex | Usage |
|---|---|---|
| `nuit` / `ink` | `#16153a` | texte, fonds sombres |
| `nuit-doux` | `#e9e8f4` | badges et étiquettes discrets |
| `billet` / `ember` | `#d23f24` | bouton principal uniquement (blanc dessus : 4,7:1) |
| `billet-600` | `#b8361d` | survol du bouton principal |
| `billet-soft` | `#fde8e3` | fond des « Changement à … », plage du calendrier |
| `ok` / `ok-soft` | `#0b7f58` / `#e2f4ec` | « Réservé », progression, notes d'hôtel |
| `page` | `#f5f6fa` | fond de page |
| `line` | `#e3e4ee` | bordures |
| `slate-500` / `slate-400` | `#5a5b78` / `#6f7090` | textes secondaires (≥ 4,5:1 sur blanc) |
| `navy` | `#0e3c60` | bleu du logo, fond des photos manquantes |

Les anciens noms (`ink`, `ember`, `ember-soft`…) restent définis et pointent vers la nouvelle palette.

### Couleurs de transport (#27, #40)

| Mode | Token | Hex |
|---|---|---|
| Train | `train` | `#1f5bea` |
| Bus / car | `bus` | `#0b7f58` |
| Avion | `plane` | `#7340e0` |
| Voiture | `car` | `#a66300` |
| Marche | `walk` | `#5a5b78` (trait pointillé) |

Source unique : `MODE_COLOR` dans `src/utils/constants/transport.ts`, utilisée par la carte (`TravelMap`), les barres de modes et les étiquettes. Une couleur est toujours accompagnée d'une icône et d'un libellé.

## Globals (`src/styles/globals.css`)

- `.font-display`, `.eyebrow` (label uppercase 12px, `letter-spacing: 0.12em`), `.scroll-slim`, `.no-scrollbar`.
- Animations `animate-fade-in`, `animate-sheet-up`, `md:animate-slide-in`, `md:animate-fade-up` (panneaux), désactivées si `prefers-reduced-motion`.
- Contour de focus clavier bleu (`--color-train`) sur `:focus-visible`.

## Composants

- **`ui.tsx`** — icônes SVG (`IconExternal`, `IconChevron`, `IconCalendar`, `IconInfo` ajoutées), `MODE_ICON`, primitives `Eyebrow`, `Chip`, `Button`.
- **`Sheet.tsx`** — panneau générique : feuille qui monte du bas sur mobile ; sur ordinateur tiroir latéral (`variant="drawer"`) ou fenêtre centrée (`variant="modal"`). Échap ferme, défilement de la page bloqué.
- **`DateRangePicker.tsx`** — calendrier en plage + heures facultatives : bascule aller-retour / aller simple (accueil seulement), cases Aller / Retour (case active encadrée `billet`), bande continue `billet-soft` entre les deux dates, aperçu au survol (bande `billet-soft/60`, jour de retour cerclé `billet`).
- **`LoadingScreen.tsx`** / **`LogoLoader.tsx`** — écran d'attente : logo animé (étoile seule, sans orbite statique ni trait vers le centre) : un tracé orange part du pied gauche, passe en bas vers la droite, monte à droite, passe en haut, redescend à gauche et finit au centre de l'étoile, sa traînée s'effaçant derrière lui (3 couches `logo-trail-head/mid/tail`, dessinées au-dessus de l'étoile, dont l'épaisseur double progressivement) ; l'étoile pulse. Sans animation si `prefers-reduced-motion`. Titre et messages adaptés au voyage via `loadingCopy(roundTrip, withHotel)` (`src/utils/loading.ts`) : « On prépare ton aller-retour / aller simple », messages aller, hôtel, retour (retour seulement en aller-retour). Animations `logo-*` et `loading-bar` dans `globals.css`.
- **`components/trip/`** — `Steps` (progression horizontale / verticale), `Leg` (faits, barre de modes, segments, horaires SNCF), `OptionList`, `HotelPicker`, `TripMap`, `TripPanels`.

## Cartes « Des idées de sortie »

Toutes les cartes d'une ligne ont la même hauteur. Le titre de la sortie est toujours en haut, sous l'icône. La ville et la date sont toujours collées en bas de la carte (`flex-col` + `mt-auto`), même quand les titres n'ont pas le même nombre de lignes.

## Alignement horizontal

Tout le contenu des pages suit le même axe : conteneur `mx-auto max-w-6xl` avec la marge **à l'intérieur** (`px-4 md:px-8`). Les fonds pleine largeur (hero, pied de page) portent la couleur ou l'image, et le conteneur à l'intérieur porte la marge. L'en-tête (logo) garde sa propre marge, sur toute la largeur.

## Ton éditorial

Tutoiement, phrases courtes, verbes d'action. On nomme les choses comme le voyageur (« hôtel », « trajet », « voyage ») et pas comme le code (« bundle », « segment »). Les boutons disent où ils mènent : « Réserver sur Trainline ↗ ».

## Images

- `public/images/concert-crowd-hd.jpg` — photo de Nainoa Shizuru sur Unsplash (`photo-1459749411175-04bf5292ceea`, 2400 × 1600 pour rester nette en plein écran) : fond de l'accueil et carte événement. La licence Unsplash n'impose pas de créditer l'auteur, le crédit n'est donc plus affiché. Le nom de fichier a changé lors du passage en haute définition, pour que le cache d'images de Next ne resserve pas l'ancienne version de 800 px.
- `public/images/tgv.jpg` — photo de snap wander sur Unsplash (licence Unsplash) : cartes de trajet en train.
- Photos d'hôtels : fournies par LiteAPI (`static.cupid.travel`).

## Icône d'onglet

`public/favicon/logo-star.svg` : étoile détaillée + orbite, sans le texte « BUNDLE - EVENTS », recadrée en carré. Déclarée dans `metadata.icons` (`src/app/layout.tsx`) pour les onglets clairs ; `logo-star-light.svg` (étoile claire, même dessin) pour `(prefers-color-scheme: dark)`. Replis : `logo-star-32.png`, `logo-star-48.png`, `logo-star-96.png`, `logo-star.ico` (16/32/48). `src/app/favicon.ico` est cette même étoile, donc `/favicon.ico` ne renvoie plus le triangle Next. `site.webmanifest` nomme l'app « Bundle Events » et pointe vers `/favicon/web-app-manifest-192x192.png` et `-512x512.png`.

## Cartes d'arguments de l'accueil

Chaque carte a sa propre icône dans une pastille `bg-ember-soft text-ember` (40 px, coins `rounded-xl`) : `IconSearch` (une seule recherche), `IconSliders` (voyage modifiable), `IconShare` (lien à partager).
