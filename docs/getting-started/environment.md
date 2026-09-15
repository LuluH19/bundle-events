# Variables d'environnement

[← Sommaire](../README.md)

| Variable | Utilisée dans | Rôle |
|---|---|---|
| `SNCF_API_KEY` | `config/sncf.ts` | API SNCF (gares, trajets trains, géométrie) |
| `TRAVEL_PAYOUTS_API_KEY` | `config/travelpayouts.ts` | Prix des vols (Aviasales) |
| `LITEAPI_KEY` | `config/liteapi.ts` | Recherche d'hôtels (fallback sandbox codé en dur) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `config/mapbox.ts`, `TravelMap.tsx` | Geocoding + rendu des cartes |
| `NEXT_PUBLIC_SUPABASE_URL` | `config/supabase.ts` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `config/supabase.ts` | Clé service-role **serveur uniquement** |
| `NEXT_PUBLIC_SITE_URL` | `config/supabase.ts` | Base des liens de bundle (email). Défaut `http://localhost:3000` |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | `instrumentation-client.ts` | Token public du projet PostHog (pas une clé API personnelle) |
| `NEXT_PUBLIC_POSTHOG_HOST` | `instrumentation-client.ts` | Hôte d'ingestion du projet PostHog : `https://eu.i.posthog.com` ou `https://us.i.posthog.com` selon la région |
| `BREVO_API_KEY` | `lib/email.ts` | Envoi email via Brevo |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | `lib/email.ts` | Expéditeur (`Nom <email>` ou email brut) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env` uniquement | Présente mais non référencée dans le code |
| `BREVO_SMTP_KEY` | `.env` uniquement | Non utilisée dans le code |

`.env.example` liste : `SNCF_API_KEY, TRAVEL_PAYOUTS_API_KEY, NEXT_PUBLIC_MAPBOX_TOKEN, LITEAPI_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, NEXT_PUBLIC_POSTHOG_HOST`.

**PostHog** : renseigner les deux variables dans `.env.local` et dans Vercel, puis reconstruire/redéployer (les variables `NEXT_PUBLIC_` sont intégrées au build). Sans token ou sans hôte, PostHog ne s'initialise pas. Pour tester, visiter le site puis naviguer entre les étapes et vérifier les événements `$pageview` dans PostHog. Utiliser un projet distinct pour les tests locaux si nécessaire.

**Sécurité** : `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais avoir de préfixe `NEXT_PUBLIC_` (fuite dans le bundle client). Tout accès DB passe par des Route Handlers serveur.
