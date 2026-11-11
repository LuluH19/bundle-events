# Sous-système hôtels

[← Sommaire](../README.md)

## Providers (`src/adapters/hotels/`)

- **`liteapi.adapter.ts`** (`LiteApiHotelAdapter`) — **provider en production**. POST vers **LiteAPI** `/v3.0/hotels/rates` (lat/lng, rayon m, 2 adultes, EUR, FR, dates, limit 100). Mappe `rates` + `data.hotels[]` → `HotelMapItem[]` (`source:"liteapi"`), `pricePerNight` via `getDaysDiff`. Photos depuis `static.cupid.travel` (autorisé dans `next.config.ts`).
- **`overpass.adapter.ts`** (`OverpassHotelAdapter`) — provider OSM alternatif (3 miroirs, `tourism=hotel/hostel/guest_house`), cache 5 min qui **ne met jamais en cache un résultat vide**. **Existe mais n'est pas branché** sur `/api/hotels/search`.

## API & utils

- `/api/hotels/search` → LiteAPI, tri `pricePerNight` croissant.
- `src/utils/hotel.ts` : `getHotelDistance(hotel, venue)` (haversine, `null` si inconnu) ; `deduplicateHotels` (fusion coord + nom flou, non câblé).

## Choix automatique (`src/utils/algorithms/recommend.ts`)

`pickHotel(hotels, salle, préférence)` (testé dans `src/__tests__/recommend.test.ts`) :
- ne garde que les hôtels avec un prix s'il y en a ;
- cherche d'abord à moins de 1,6 km de la salle (environ 20 min à pied), puis à moins de 5 km, puis partout ;
- **le plus rapide** : meilleure note (`rating`, sinon étoiles × 2), puis le plus proche ;
- **le moins cher** : plus petit prix par nuit ;
- **le plus vert** : le plus proche de la salle.

Aller-retour dans la journée : un hôtel (1 nuit) est encore proposé. Le retrait prévu par le ticket #137 est commenté dans le code (`TODO #137`).

## Choix manuel (`src/components/trip/HotelPicker.tsx`)

Ouvert par « Changer » sur le bloc Nuit (écran Ton voyage ou Réserver), dans un `Sheet` :
- tri **Recommandé** (le choix de `pickHotel` en tête) / **Plus proche** / **Moins cher**, rayon (`Dropdown`, 2 à 50 km) ;
- carte à la demande (`TravelMap` avec les hôtels du rayon ; un clic sur un marqueur choisit l'hôtel) ;
- chaque hôtel : photo LiteAPI, nom, étoiles, note, temps à pied (< 2,5 km) ou distance, prix par nuit, bouton « Choisir ».
- La réservation se fait depuis l'écran Réserver (« Réserver sur Booking.com », [booking-links.md](./booking-links.md)) ; arrivée affichée dès 14:00, départ avant 11:00.

## Type `HotelMapItem`

```ts
{ id, name, locationName, coords, stars?, website?, phone?, type?, photo?, pricePerNight?, currency?, rating?, source? }
```
