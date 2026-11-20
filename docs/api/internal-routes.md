# API — Routes internes

[← Sommaire](../README.md)

Route Handlers Next.js sous `src/app/api/**` (exportent `GET`/`POST`/`PATCH`).

## Bundles (Supabase)

- **`api/bundles/route.ts`** — `POST`. Crée un bundle. Body `{ data: BundleSnapshot }` → insert Supabase → `{ uuid }` (201).
- **`api/bundles/[uuid]/route.ts`** — `GET` (récupère `uuid,email,data,created_at,updated_at`, 404 si absent) et `PATCH` (met à jour `data`).
- **`api/bundles/[uuid]/save/route.ts`** — `POST`. Body `{ email }` (validé par regex). Enregistre l'email, appelle `sendBundleLinkEmail`, retourne `{ ok, link, sent }`.

## Recherche

Toutes ces routes, sauf les cars, passent par le [cache partagé](../architecture/api-cache.md) (en-tête `X-Cache`).

- **`api/hotels/search/route.ts`** — `GET`. Query `lat,lng,radius(=10),checkin,checkout`. → **LiteAPI** (tri `pricePerNight` asc., hôtels sans prix à la fin, cache 1 h), puis repli : hôtels déjà vus autour de la salle (sans prix), puis **Overpass** (OSM, 5 km), puis `[]`. En-tête `X-Data-Source: liteapi | liteapi-venue | overpass | none`.
- **`api/events/search/route.ts`** — `GET`. Query `q` (recherche libre ; si `q` est une ville, ses concerts, festivals, spectacles et matchs à venir passent en tête, avant les résultats plein texte) ou `cities=Paris,Lyon,…` (idées de sortie : événements à venir filtrés sur `eventsConfig.ideaKeywords`, situés dans ces villes, alternés ville par ville, `eventsConfig.ideasLimit` au plus, sans lieux Mapbox/OSM). Dans les deux cas, la première lettre de chaque titre est mise en majuscule (`capitalizeFirst`, `utils/format.ts`), les sources renvoyant parfois des titres en minuscules. Événements (Ticketmaster → OpenAgenda → Open Data IDF) + lieux (Mapbox POI, Nominatim), dédoublonnés et classés. → `{ venues, eventSource }`. Garde la clé Ticketmaster côté serveur. Chaque fournisseur est en cache (événements 6 h, lieux 7 j).
- **`api/buses/search/route.ts`** — `GET`. Query `fromLat,fromLng,toLat,toLng,date?`. Meilleure liaison directe en car entre les arrêts proches (≤ 50 km) d'après `bus-network.json` ; `date` filtre les jours de circulation. → `{ connection: { operator, from, to, durationMinutes, departures[] } | null, validTo }`. Aucun appel externe, donc pas de cache.
- **`api/flights/search/route.ts`** — `GET`. Query `origin,destination` (IATA), `departure_at?`. → **Travelpayouts** `aviasales/v3/prices_for_dates` (EUR, tri prix, limit 5), cache 3 h. → `{ flights }`, ou `503 { flights: [], degraded: true }` si indisponible sans copie.
- **`api/stations/route.ts`** — `GET`. Query `lat,lng,radius(=50)?`. Cache 7 j de tous les `stop_areas` **SNCF** (paginé, Basic auth ; une page en échec fait échouer la liste, `503` sans copie). Avec lat/lng : ≤20 gares les plus proches ; sinon toutes. → `{ stations, total }`.
- **`api/trains/search/route.ts`** — `GET`. Query `from,to` (IDs SNCF), `datetime?`, `represents?` (`departure` par défaut, ou `arrival` pour « arriver avant »). → **SNCF** `/journeys` (count 5, temps réel) → `TrainDetail[]` + coords + tarif, cache 10 min (6 h sans `datetime`). → `{ journeys }`, ou `503 { journeys: [], degraded: true }`.
- **`api/trains/route-geometry/route.ts`** — `GET`, `dynamic="force-dynamic"`. Query `from,to`. Polyligne stylée : trajet SNCF → arrêts (`vehicle_journeys`) → géométrie via **OpenRailRouting** (train) ou `fetchRoadRoute` (Mapbox Directions → OSRM) pour la marche et la route. Cache 7 j par paire de gares (Supabase). → `{ coordinates, sections, stops }`.

## Deep-links de réservation (redirections 302)

- **`api/booking/train/route.ts`** — `GET`. Résout les noms de gare → URNs **Trainline**, redirige vers `book/results` (A/R via `journeySearchType=return` + `inwardDate`). Repli : Google Maps transit.
- **`api/booking/bus/route.ts`** — `GET`. Résout les villes → UUIDs **FlixBus**, redirige vers `shop.flixbus.com/search` (A/R via `returnDate`). Repli : Google Maps transit.

Détails : [../features/booking-links.md](../features/booking-links.md).

## Diagnostic

- **`api/health/email/route.ts`** — `GET`. Sans param : renvoie `{ brevoConfigured, from:{name,email} }` (vérifie si `BREVO_API_KEY` est présent et ce que `EMAIL_FROM` produit). Avec `?send=1` : tente un envoi Brevo **vers l'expéditeur lui-même** (donc non abusable) et renvoie `test:{ ok, status, body }` (la réponse exacte de Brevo : 201 OK / 400 sender invalide / 401 clé invalide). Outil de debug prod — supprimable une fois l'email fiabilisé.
