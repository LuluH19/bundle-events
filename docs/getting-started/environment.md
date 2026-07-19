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
| `BREVO_API_KEY` | `lib/email.ts` | Envoi email via Brevo |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | `lib/email.ts` | Expéditeur (`Nom <email>` ou email brut) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env` uniquement | Présente mais non référencée dans le code |
| `BREVO_SMTP_KEY` | `.env` uniquement | Non utilisée dans le code |

`.env.example` liste : `SNCF_API_KEY, TRAVEL_PAYOUTS_API_KEY, NEXT_PUBLIC_MAPBOX_TOKEN, LITEAPI_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL`.

**Sécurité** : `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais avoir de préfixe `NEXT_PUBLIC_` (fuite dans le bundle client). Tout accès DB passe par des Route Handlers serveur.
