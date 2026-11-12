# Bundle Events

> Composez votre voyage évènementiel en un seul parcours : évènement, hébergement et transport aller / retour, réunis dans un récapitulatif partageable.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)

---

## Sommaire

- [Présentation](#présentation)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Services externes](#services-externes)
- [Tests et qualité](#tests-et-qualité)
- [Déploiement](#déploiement)
- [Contribuer](#contribuer)
- [Documentation](#documentation)

## Présentation

Bundle Events simplifie l'organisation des déplacements vers un concert, un match ou un salon. Au lieu de jongler entre plusieurs onglets, l'utilisateur choisit son point de départ et son évènement, sélectionne un hôtel à proximité, compare les options de transport, puis obtient une page récapitulative (le « bundle ») avec des liens de réservation pré-remplis.

Chaque bundle possède une URL unique (`/{uuid}/...`), peut être sauvegardé, partagé par lien ou QR code, et envoyé par email.

## Fonctionnalités

| Étape | Description |
|---|---|
| **1. Départ et évènement** | Autocomplétion de l'adresse de départ (Mapbox) et recherche d'évènements ou de lieux agrégée depuis plusieurs sources (Open Data Île-de-France, Mapbox POI, OpenStreetMap). Choix des dates, aller simple ou aller-retour, avec validation des dates. |
| **2. Hébergement** | Liste et carte des hôtels autour du lieu (LiteAPI), filtres par rayon et tri, fiche détaillée, vérification de disponibilité. |
| **3. Trajet aller** | Comparaison des modes de transport (train, avion, bus, voiture, marche) : durée, distance, prix indicatif et impact CO2. Détail en direct des trains SNCF et des vols. |
| **4. Trajet retour** | Même comparaison pour le retour (masquée en aller simple). |
| **5. Bundle final** | Récapitulatif complet, total estimé, liens de réservation (Trainline, FlixBus, Kayak, Google Flights, Booking.com, Google Maps), sauvegarde, partage et envoi par email. |

Points notables :

- **Itinéraires sur carte** : tracés routiers et ferroviaires réels (OSRM, OpenRailRouting) affichés via Mapbox GL.
- **Bundle persistant** : l'état est sauvegardé dans Supabase et réhydraté à partir de l'URL.
- **Responsive** : rail de navigation sur desktop, barre d'onglets et carte plein écran sur mobile.

## Stack technique

| Domaine | Outils |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router), React 19, TypeScript |
| Styles | Tailwind CSS v4 |
| Cartographie | Mapbox GL JS |
| Données | Supabase (PostgreSQL) |
| Emailing | Brevo |
| Analytics et logs | PostHog, Vercel Analytics, OpenTelemetry |
| Tests | Vitest (unitaires et intégration), Playwright (E2E) |
| CI | GitHub Actions |

## Démarrage rapide

### Prérequis

- Node.js 24 (version utilisée par la CI)
- npm 11 (recommandé pour régénérer le lockfile)
- Clés d'API pour les services listés dans [Variables d'environnement](#variables-denvironnement)

### Installation

```bash
git clone https://github.com/LuluH19/bundle-events.git
cd bundle-events
npm ci
cp .env.example .env.local   # puis renseigner les clés
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Geocoding, recherche de lieux et rendu des cartes |
| `LITEAPI_KEY` | Recherche d'hôtels et prix |
| `SNCF_API_KEY` | Gares, trajets et horaires de trains |
| `TRAVEL_PAYOUTS_API_KEY` | Prix des vols (Aviasales) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service-role Supabase, **côté serveur uniquement** |
| `NEXT_PUBLIC_SITE_URL` | URL de base des liens envoyés par email (défaut `http://localhost:3000`) |
| `BREVO_API_KEY` | Envoi des emails via Brevo |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | Expéditeur des emails |
| `POSTHOG_PROJECT_TOKEN` / `POSTHOG_HOST` | Analytics et logs PostHog (optionnel) |

> **Sécurité** : ne jamais préfixer `SUPABASE_SERVICE_ROLE_KEY` par `NEXT_PUBLIC_`. Tout accès à la base passe par les Route Handlers serveur.

Détails complets : [docs/getting-started/environment.md](./docs/getting-started/environment.md).

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run lint` | Analyse ESLint |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `npm run test` | Tests Vitest |
| `npm run test:watch` | Tests Vitest en mode watch |
| `npm run test:e2e` | Tests end-to-end Playwright |

## Architecture

```
src/
├── adapters/      # Mapping des payloads d'APIs externes vers les types internes
├── app/           # Routing Next.js (pages + api/ Route Handlers)
├── components/    # Présentation (views/ par étape, layout/)
├── config/        # Configuration des APIs externes
├── lib/           # Clients tiers (Supabase, email, logs)
├── services/      # Récupération de données côté client
├── styles/        # Thème et styles globaux
├── types/         # Définitions TypeScript
└── utils/
    ├── algorithms/  # Logique pure (routing, calculs géodésiques, dédoublonnage)
    └── constants/   # Jeux de données statiques (aéroports, gares routières, transports)
```

Flux de données :

```
BundleBuilder (client)
  -> services/*            appels vers /api/*
    -> app/api/*/route.ts  Route Handlers serveur
      -> adapters/*        normalisation des réponses
        -> APIs externes   LiteAPI, SNCF, Mapbox, ...
```

`src/components/BundleBuilder.tsx` est l'orchestrateur central : il détient l'état, réhydrate le bundle depuis Supabase, le persiste et affiche l'étape courante.

Plus de détails : [docs/architecture/overview.md](./docs/architecture/overview.md).

## Services externes

| Service | Usage |
|---|---|
| Mapbox | Geocoding, recherche de lieux, cartes |
| LiteAPI | Hôtels et prix |
| SNCF | Gares et trajets ferroviaires |
| Travelpayouts | Prix des vols |
| OSRM / OpenRailRouting | Géométrie des itinéraires routiers et ferroviaires |
| Open Data Île-de-France / Nominatim | Évènements et lieux |
| Supabase | Persistance des bundles |
| Brevo | Envoi des emails |

Liste complète et endpoints : [docs/api/external-apis.md](./docs/api/external-apis.md).

## Tests et qualité

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

La CI GitHub Actions (`.github/workflows/ci.yml`) s'exécute sur les push et pull requests vers `main` et `dev` et enchaîne : lint des commits, ESLint, vérification TypeScript, `npm audit` (échec sur vulnérabilités hautes ou critiques), build Next.js, démarrage du serveur de dev et validation du titre de PR.

## Déploiement

Le projet est conçu pour être déployé sur **Vercel** :

1. Reporter toutes les variables d'environnement dans les paramètres du projet Vercel.
2. Définir `NEXT_PUBLIC_SITE_URL` sur l'URL de production.
3. Activer Vercel Web Analytics si souhaité.

Guide complet : [docs/getting-started/installation.md](./docs/getting-started/installation.md).

## Contribuer

1. Créer une branche depuis `dev` (`feat/...`, `fix/...`).
2. Garder la documentation de `docs/` synchronisée avec tout changement de comportement, de structure, d'API ou de variable d'environnement.
3. Vérifier `lint`, `typecheck` et `test` avant d'ouvrir une pull request vers `dev`.

### Conventional Commits

Les messages de commit et les titres de PR suivent la spécification [Conventional Commits](https://www.conventionalcommits.org/), vérifiée automatiquement par la CI (commitlint).

```
<type>(<scope>): <sujet>
```

Types autorisés : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

```bash
git commit -m "feat(hotels): ajouter le filtre par rayon"
git commit -m "fix(routes): corriger le calcul du trajet retour"
git commit -m "docs: mettre à jour le README"
```

Le type et le sujet s'écrivent en minuscules ; un commit sans type est refusé.

## Documentation

La documentation détaillée se trouve dans [`docs/`](./docs/README.md) :

- [Installation et environnement](./docs/getting-started/)
- [Architecture, routing et persistance](./docs/architecture/)
- [Routes internes et APIs externes](./docs/api/)
- [Schéma de base de données](./docs/database/schema.md)
- [Design system](./docs/design/design-system.md)
- [Fonctionnalités](./docs/features/)
- [Conventions de contribution](./docs/contributing/conventions.md)
