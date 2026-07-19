# API — Routes internes

[← Sommaire](../README.md)

Route Handlers Next.js sous `src/app/api/**` (exportent `GET`/`POST`/`PATCH`).

## Bundles (Supabase)

- **`api/bundles/route.ts`** — `POST`. Crée un bundle. Body `{ data: BundleSnapshot }` → insert Supabase → `{ uuid }` (201).
- **`api/bundles/[uuid]/route.ts`** — `GET` (récupère `uuid,email,data,created_at,updated_at`, 404 si absent) et `PATCH` (met à jour `data`).
- **`api/bundles/[uuid]/save/route.ts`** — `POST`. Body `{ email }` (validé par regex). Enregistre l'email, appelle `sendBundleLinkEmail`, retourne `{ ok, link, sent }`.

## Recherche

- **`api/hotels/search/route.ts`** — `GET`. Query `lat,lng,radius(=10),checkin,checkout`. → `LiteApiHotelAdapter`, tri `pricePerNight` asc. → **LiteAPI**.
- **`api/flights/search/route.ts`** — `GET`. Query `origin,destination` (IATA), `departure_at?`. → **Travelpayouts** `aviasales/v3/prices_for_dates` (EUR, tri prix, limit 5). → `{ flights }`.
- **`api/stations/route.ts`** — `GET`. Query `lat,lng,radius(=50)?`. Cache 24h de tous les `stop_areas` **SNCF** (paginé, Basic auth). Avec lat/lng : ≤20 gares les plus proches ; sinon toutes. → `{ stations, total }`.
- **`api/trains/search/route.ts`** — `GET`. Query `from,to` (IDs SNCF), `datetime?`. → **SNCF** `/journeys` (count 5, temps réel) → `TrainDetail[]` + coords + tarif. → `{ journeys }`.
- **`api/trains/route-geometry/route.ts`** — `GET`, `dynamic="force-dynamic"`. Query `from,to`. Polyligne stylée : trajet SNCF → arrêts (`vehicle_journeys`) → géométrie via **OpenRailRouting** (train) ou **OSRM** (marche). Cache 30 min. → `{ coordinates, sections, stops }`.

## Deep-links de réservation (redirections 302)

- **`api/booking/train/route.ts`** — `GET`. Résout les noms de gare → URNs **Trainline**, redirige vers `book/results` (A/R via `journeySearchType=return` + `inwardDate`). Repli : Google Maps transit.
- **`api/booking/bus/route.ts`** — `GET`. Résout les villes → UUIDs **FlixBus**, redirige vers `shop.flixbus.com/search` (A/R via `returnDate`). Repli : Google Maps transit.

Détails : [../features/booking-links.md](../features/booking-links.md).
