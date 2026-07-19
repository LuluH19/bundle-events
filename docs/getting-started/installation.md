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

## Déploiement (Vercel)

- Reporter **toutes** les [variables d'environnement](./environment.md) dans les settings Vercel — le `.env` local n'est pas déployé.
- Mettre `NEXT_PUBLIC_SITE_URL` sur l'URL de production (elle construit le lien du bundle dans l'email ; le lien affiché dans la popup utilise `window.location.origin` et est donc correct automatiquement).
- Emailing : voir [../features/save-and-email.md](../features/save-and-email.md) pour l'activation Brevo.
