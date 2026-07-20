# Sous-système hôtels

[← Sommaire](../README.md)

## Providers (`src/adapters/hotels/`)

- **`liteapi.adapter.ts`** (`LiteApiHotelAdapter`) — **provider en production**. POST vers **LiteAPI** `/v3.0/hotels/rates` (lat/lng, rayon m, 2 adultes, EUR, FR, dates, limit 100). Mappe `rates` + `data.hotels[]` → `HotelMapItem[]` (`source:"liteapi"`), `pricePerNight` via `getDaysDiff`. Photos depuis `static.cupid.travel` (autorisé dans `next.config.ts`).
- **`overpass.adapter.ts`** (`OverpassHotelAdapter`) — provider OSM alternatif (3 miroirs, `tourism=hotel/hostel/guest_house`), cache 5 min qui **ne met jamais en cache un résultat vide**. **Existe mais n'est pas branché** sur `/api/hotels/search`.

## API & utils

- `/api/hotels/search` → LiteAPI, tri `pricePerNight` croissant.
- `src/utils/hotel.ts` : `getHotelDistance(hotel, venue)` (haversine, `null` si inconnu) ; `deduplicateHotels` (fusion coord + nom flou, non câblé).

## Vue (`src/components/views/HotelsView.tsx`)

- Liste + carte (`TravelMap` dynamique), rayon (`Dropdown`), tri (proximité / prix).
- Carte : photo, nom, `locationName`, distance au venue, prix `NNN€/nuit` (**€ après** le montant).
- **« Vérifier la disponibilité »** → deep-link Booking.com ([booking-links.md](./booking-links.md)).
- **« Sélectionner »** → ouvre la **modale de détail**.

### Modale de détail
- Bottom-sheet ancrée en bas (mobile **et** PC), glissement depuis le bas, croix fixe (hors zone scrollable), scrollbar masquée.
- **PC** : deux colonnes — image à gauche, contenu à droite (`md:flex-row`, large).
- Contenu : image + badge prix, nom, adresse, cartes **Arrivée (14:00)** / **Départ (11:00)**, **distance en km**, section **Localisation** (mini-carte `TravelMap`, `fitPadding={40}`) + lien **« Agrandir »** (Google Maps).
- CTA flottant **« Choisir ce logement et voir les transports »** → `onChooseHotel` : persiste l'hôtel puis navigue (voir [../architecture/state-and-persistence.md](../architecture/state-and-persistence.md)).

## Type `HotelMapItem`

```ts
{ id, name, locationName, coords, stars?, website?, phone?, type?, photo?, pricePerNight?, currency?, rating?, source? }
```
