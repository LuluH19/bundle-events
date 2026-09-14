# Installation & scripts

[← Sommaire](../README.md)

## Installation

```bash
npm install
cp .env.example .env      # puis remplir les clés (voir environment.md)
npm run dev               # http://localhost:3000
```

## Scripts (`package.json`)

| Script | Rôle |
|---|---|
| `npm run dev` | serveur de développement Next |
| `npm run build` | build de production |
| `npm run start` | serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` / `test:watch` | Vitest |
| `npm run test:e2e` | Playwright |

## Maintenance des dépendances

- Versions corrigées : Next.js `16.3.5` (avec `eslint-config-next` aligné) et Vitest `4.1.11`. Le lockfile inclut les correctifs des dépendances transitives signalées par `npm audit`.
- Utiliser `npm ci` pour reproduire les versions du lockfile, puis `npm audit` pour vérifier les vulnérabilités connues.
- Si npm 10 échoue avec `Cannot read properties of null (reading 'edgesOut')`, lancer `npx --yes npm@11 audit fix`, puis vérifier le build, les tests et le lint.

## Déploiement (Vercel)

- Reporter **toutes** les [variables d'environnement](./environment.md) dans les settings Vercel — le `.env` local n'est pas déployé.
- Mettre `NEXT_PUBLIC_SITE_URL` sur l'URL de production (elle construit le lien du bundle dans l'email ; le lien affiché dans la popup utilise `window.location.origin` et est donc correct automatiquement).
- Emailing : voir [../features/save-and-email.md](../features/save-and-email.md) pour l'activation Brevo.
- Audience : activer Web Analytics dans le projet Vercel, déployer puis visiter le site pour commencer à collecter les pages vues. Le composant est déjà intégré au layout racine via `@vercel/analytics/next`. Si aucune donnée n'apparaît après 30 secondes, vérifier les bloqueurs de contenu et naviguer entre les pages du site.
