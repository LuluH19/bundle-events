# Documentation — Bundle Events

Bundle Events assemble un « bundle » de voyage évènementiel : l'utilisateur choisit un point de départ et un évènement (salle/stade), un hôtel à proximité, un ou plusieurs trajets (aller / retour), puis obtient une page récapitulative partageable avec des liens de réservation pré-remplis.

> **⚠️ Cette documentation doit rester synchronisée avec le code.** Toute modification touchant le comportement, la structure, les APIs, les variables d'environnement, les features ou les conventions doit être répercutée dans le fichier `docs/` concerné, dans le même changement.

## Structure

```
docs/
├── getting-started/    Installation, environnement
├── architecture/       Couches, routing/URL, état & persistance
├── api/                Routes internes + APIs externes
├── database/           Supabase (table bundles)
├── design/             Design system
├── features/           Parcours, hôtels, transport, réservation, email
└── contributing/       Conventions, tests, commits
```

## Sommaire

### Getting started
- [Installation & scripts](./getting-started/installation.md)
- [Variables d'environnement](./getting-started/environment.md)

### Architecture
- [Vue d'ensemble (couches & flux)](./architecture/overview.md)
- [Routing & URLs](./architecture/routing-and-urls.md)
- [État & persistance](./architecture/state-and-persistence.md)

### API
- [Routes internes (`/api/*`)](./api/internal-routes.md)
- [APIs externes](./api/external-apis.md)

### Base de données
- [Schéma Supabase](./database/schema.md)

### Design
- [Design system](./design/design-system.md)

### Features
- [Parcours utilisateur](./features/user-flow.md)
- [Sous-système hôtels](./features/hotels.md)
- [Algorithme de transport](./features/transport-routing.md)
- [Liens de réservation](./features/booking-links.md)
- [Sauvegarde & email](./features/save-and-email.md)

### Contribution
- [Conventions](./contributing/conventions.md)

## Résumé technique

- **Framework** : Next.js `^16.2.10` (App Router), React `19.2.4`, TypeScript.
- **Styles** : Tailwind CSS v4. **Données** : Supabase. **Cartes** : Mapbox GL. **Emailing** : Brevo.
- **Alias d'import** : `@/*` → racine (imports en `@/src/...`).
- Orchestrateur central : `src/components/BundleBuilder.tsx` (état, hydratation, persistance, rendu de l'étape).
