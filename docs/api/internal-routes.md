# API — Routes internes

[← Sommaire](../README.md)

Route Handlers Next.js sous `src/app/api/**` (exportent `GET`/`POST`/`PATCH`).

## Bundles (Supabase)

- **`api/bundles/route.ts`** — `POST`. Crée un bundle. Body `{ data: BundleSnapshot }` (objet, pas un tableau) → insert Supabase → `{ uuid }` (201).
- **`api/bundles/[uuid]/route.ts`** — `GET` (récupère `uuid,data,created_at,updated_at` ; l'email n'est **jamais** renvoyé, la route étant lisible par quiconque a le lien) et `PATCH` (met à jour `data`). 404 si l'uuid est mal formé ou si aucune ligne ne correspond.
- **`api/bundles/[uuid]/save/route.ts`** — `POST`. Body `{ email }` (chaîne ≤ 254 caractères, validée par regex). Enregistre l'email, appelle `sendBundleLinkEmail`, retourne `{ ok, link, sent }`. 404 si l'uuid est mal formé ou inconnu.
- Les trois routes renvoient `{ error: "Database error" }` (500) sur erreur Supabase ; le détail part dans les logs serveur, pas au client.

## Recherche

Toutes ces routes, sauf les cars, passent par le [cache partagé](../architecture/api-cache.md) (en-tête `X-Cache`).

- **`api/hotels/search/route.ts`** — `GET`. Query `lat,lng,radius(=10, plafonné à 50),checkin,checkout` (`lat`/`lng` numériques dans les bornes, dates `YYYY-MM-DD`, sinon 400). → **LiteAPI** (tri `pricePerNight` asc., hôtels sans prix à la fin, cache 1 h), puis repli : hôtels déjà vus autour de la salle (sans prix), puis **Overpass** (OSM, 5 km), puis `[]`. En-tête `X-Data-Source: liteapi | liteapi-venue | overpass | none`.
- **`api/events/search/route.ts`** — `GET`. Query `q` (recherche libre ; si `q` est une ville, ses concerts, festivals, spectacles et matchs à venir passent en tête, avant les résultats plein texte) ou `cities=Paris,Lyon,…` (idées de sortie : événements à venir filtrés sur `eventsConfig.ideaKeywords`, situés dans ces villes, alternés ville par ville, `eventsConfig.ideasLimit` au plus, sans lieux Mapbox/OSM). Dans les deux cas, la première lettre de chaque titre est mise en majuscule (`capitalizeFirst`, `utils/format.ts`), les sources renvoyant parfois des titres en minuscules. Événements (Ticketmaster → OpenAgenda → Open Data IDF) + lieux (Mapbox POI, Nominatim), dédoublonnés et classés. → `{ venues, eventSource }`. Garde la clé Ticketmaster côté serveur. Chaque fournisseur est en cache (événements 6 h, lieux 7 j).
- **`api/buses/search/route.ts`** — `GET`. Query `fromLat,fromLng,toLat,toLng,date?`. Meilleure liaison directe en car entre les arrêts proches (≤ 50 km) d'après `bus-network.json` ; `date` filtre les jours de circulation. → `{ connection: { operator, from, to, durationMinutes, departures[] } | null, validTo }`. Aucun appel externe, donc pas de cache.
- **`api/flights/search/route.ts`** — `GET`. Query `origin,destination` (IATA), `departure_at?`. → **Travelpayouts** `aviasales/v3/prices_for_dates` (EUR, tri prix, limit 5), cache 3 h. → `{ flights }`, ou `503 { flights: [], degraded: true }` si indisponible sans copie.
- **`api/stations/route.ts`** — `GET`. Query `lat,lng,radius(=50)?`. Cache 7 j de tous les `stop_areas` **SNCF** (paginé, Basic auth ; une page en échec fait échouer la liste, `503` sans copie). Avec lat/lng : ≤20 gares les plus proches ; sinon toutes. → `{ stations, total }`.
- **`api/trains/search/route.ts`** — `GET`. Query `from,to` (IDs SNCF), `datetime?`, `represents?` (`departure` par défaut, ou `arrival` pour « arriver avant »). → **SNCF** `/journeys` (count 5, temps réel) → `TrainDetail[]` + coords + tarif, cache 10 min (6 h sans `datetime`). → `{ journeys }`, ou `503 { journeys: [], degraded: true }`.
- **`api/trains/route-geometry/route.ts`** — `GET`, `dynamic="force-dynamic"`. Query `from,to`. Polyligne stylée : trajet SNCF → arrêts (`vehicle_journeys`) → géométrie via **OpenRailRouting** (train) ou `fetchRoadRoute` (Mapbox Directions → OSRM) pour la marche et la route. Cache 7 j par paire de gares (Supabase). → `{ coordinates, sections, stops }`.

## Prix des transports

Paramètres communs des legs : `fromName, fromLat, fromLng, toName, toLat, toLng, datetime` (`YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm`). Cache mémoire via `lib/memo-cache.ts` (`pricesConfig.quoteCacheTtl` / `fuelCacheTtl`). En-tête `X-Data-Source`.

- **`api/prices/train/route.ts`** — `GET`. → **Trainline** `journey-search` (prix du jour, seulement si l'API répond). Les appels serveur envoient `User-Agent: Mozilla/5.0` et ne se font pas passer pour un navigateur. Sinon, repli **SNCF open data** : fourchette officielle TGV INOUI / OUIGO / Intercités (min/max, `source: "tariff"`). → `{ quote: PriceQuote | null }`.
- **`api/prices/bus/route.ts`** — `GET`. → **FlixBus** `search/service/v4/search` (prix live du départ le plus proche). → `{ quote }`.
- **`api/prices/fuel/route.ts`** — `GET`. → API **prix-carburants** (moyenne nationale gazole + SP95). Repli `pricesConfig.fallbackFuelPrice`. → `{ pricePerLitre, gazole, sp95, e10, source }`.

Côté client : `services/prices.ts` (`quoteOptions`) cotise chaque option après `computeOptions` ; `utils/algorithms/price.ts` (`combineQuotes`) ajoute le coût d'accès (carburant + péages). Affichage : `components/trip/PriceTag.tsx`.

## Deep-links de réservation (redirections 302)

- **`api/booking/train/route.ts`** — `GET`. Résout les noms de gare → URNs **Trainline**, redirige vers `book/results` avec un adulte (`passengers[]=1995-01-01`, requis par Trainline) (A/R via `journeySearchType=return` + `inwardDate`). Repli : Google Maps transit.
- **`api/booking/bus/route.ts`** — `GET`. Résout les villes → UUIDs **FlixBus**, redirige vers `shop.flixbus.com/search` (A/R via `returnDate`). Repli : Google Maps transit.

Détails : [../features/booking-links.md](../features/booking-links.md).

## Diagnostic

- **`api/health/email/route.ts`** — `GET`. Sans param : renvoie `{ brevoConfigured, from:{name,email} }` (vérifie si `BREVO_API_KEY` est présent et ce que `EMAIL_FROM` produit). Avec `?send=1` : tente un envoi Brevo **vers l'expéditeur lui-même** (donc non abusable) et renvoie `test:{ ok, status, body }` (la réponse exacte de Brevo : 201 OK / 400 sender invalide / 401 clé invalide). Outil de debug prod — supprimable une fois l'email fiabilisé.
