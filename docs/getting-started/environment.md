# Variables d'environnement

[← Sommaire](../README.md)

| Variable | Utilisée dans | Rôle |
|---|---|---|
| `SNCF_API_KEY` | `config/sncf.ts` | API SNCF (gares, trajets trains, géométrie) |
| `TRAVEL_PAYOUTS_API_KEY` | `config/travelpayouts.ts` | Prix des vols (Aviasales) |
| `LITEAPI_KEY` | `config/liteapi.ts` | Recherche d'hôtels (fallback sandbox codé en dur) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `config/mapbox.ts`, `lib/map-engine.ts` | Recherche de lieux, itinéraires (Mapbox Directions), geocoding et carte de secours |
| `TICKETMASTER_API_KEY` | `config/events.ts` | Événements Ticketmaster (serveur uniquement). Sans clé, la recherche passe à OpenAgenda |
| `NEXT_PUBLIC_SUPABASE_URL` | `config/supabase.ts` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `config/supabase.ts` | Clé service-role **serveur uniquement** |
| `NEXT_PUBLIC_SITE_URL` | `config/supabase.ts`, `config/site.ts` | Base des liens de bundle (email) et de toutes les URL absolues du référencement (canonical, sitemap, Open Graph, JSON-LD, `llms.txt`). Sans elle, `config/site.ts` prend `VERCEL_PROJECT_PRODUCTION_URL` (fournie par Vercel), puis `http://localhost:3000`. Voir [../features/seo.md](../features/seo.md) |
| `POSTHOG_PROJECT_TOKEN` | `next.config.ts`, `instrumentation-client.ts`, `lib/posthog-logs.ts` | Token public du projet PostHog (pas une clé API personnelle) |
| `POSTHOG_HOST` | `next.config.ts`, `instrumentation-client.ts`, `lib/posthog-logs.ts` | Hôte d'ingestion du projet PostHog : `https://eu.i.posthog.com` ou `https://us.i.posthog.com` selon la région. Sert de destination au reverse proxy `/ingest` (`next.config.ts`) |
| `TRAINLINE_LIVE_PRICES` | `config/prices.ts` | Optionnel. `true` pour interroger Trainline `journey-search` avant les grilles SNCF dans `/api/prices/train`. Désactivé par défaut : DataDome renvoie 403 aux IP serveur (Vercel) |
| `BREVO_API_KEY` | `lib/email.ts` | Envoi email via Brevo |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | `lib/email.ts` | Expéditeur (`Nom <email>` ou email brut) |
| `API_DAILY_LIMIT_SNCF` / `_LITEAPI` / `_TRAVELPAYOUTS` / `_OVERPASS` / `_TICKETMASTER` / `_OPENAGENDA` / `_OPENDATA_IDF` / `_MAPBOX` / `_NOMINATIM` | `config/api-cache.ts` | Optionnels. Nombre max d'appels réels par jour (UTC) au fournisseur ; au-delà, seul le cache ou le repli répond. Vide = illimité (les appels restent comptés dans `api_usage`). `_MAPBOX` ne compte que la recherche de lieux côté serveur |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env` uniquement | Présente mais non référencée dans le code |
| `BREVO_SMTP_KEY` | `.env` uniquement | Non utilisée dans le code |

`.env.example` liste : `SNCF_API_KEY, TRAVEL_PAYOUTS_API_KEY, NEXT_PUBLIC_MAPBOX_TOKEN, LITEAPI_KEY, TICKETMASTER_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL, POSTHOG_PROJECT_TOKEN, POSTHOG_HOST, TRAINLINE_LIVE_PRICES, API_DAILY_LIMIT_*`.

**PostHog** : renseigner les deux variables dans `.env.local` et dans Vercel, puis reconstruire/redéployer (`next.config.ts` les intègre au bundle navigateur lors du build via `env`, elles restent donc publiques malgré l'absence du préfixe `NEXT_PUBLIC_`). Sans token ou sans hôte, PostHog ne s'initialise pas. Pour tester, visiter le site puis naviguer entre les étapes et vérifier les événements `$pageview` dans PostHog. Utiliser un projet distinct pour les tests locaux si nécessaire.

**Sécurité** : `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais avoir de préfixe `NEXT_PUBLIC_` (fuite dans le bundle client). Tout accès DB passe par des Route Handlers serveur.
