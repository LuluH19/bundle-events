# Sous-système hôtels

[← Sommaire](../README.md)

## Providers (`src/adapters/hotels/`)

- **`liteapi.adapter.ts`** (`LiteApiHotelAdapter`) — **provider en production**. POST vers **LiteAPI** `/v3.0/hotels/rates` (lat/lng, rayon m, 2 adultes, EUR, FR, dates, limit 100). Mappe `rates` + `data.hotels[]` → `HotelMapItem[]` (`source:"liteapi"`), `pricePerNight` via `getDaysDiff`. Photos depuis `static.cupid.travel` (autorisé dans `next.config.ts`).
- **`overpass.adapter.ts`** (`OverpassHotelAdapter`) — provider OSM de **repli** (3 miroirs interrogés en parallèle avec un User-Agent applicatif, `tourism=hotel/hostel/guest_house`, 40 résultats max, sans prix). Lève une erreur si tous les miroirs échouent ; le cache est géré par la route.

Les deux adapters lèvent une erreur en cas d'échec (plus de `[]` silencieux), pour que la route puisse servir une copie en cache ou passer au repli.
- **`liteapi.adapter.ts`** (`LiteApiHotelAdapter`) — **provider en production**. POST vers **LiteAPI** `/v3.0/hotels/rates` (lat/lng, rayon m, 2 adultes, EUR, FR, dates, limit 100). Mappe `rates` + `data.hotels[]` → `HotelMapItem[]` (`source:"liteapi"`), `pricePerNight` via `getDaysDiff`. Le tarif le moins cher de chaque hôtel donne aussi ses conditions (`readRateConditions`) : `refundable` (`refundableTag` RFN / NRFN), `freeCancellationUntil` (première échéance payante de `cancelPolicyInfos`, en UTC) et `board` (code `boardType`, ex. `RO`, `BI`). Photos depuis `static.cupid.travel` (autorisé dans `next.config.ts`).
- **`overpass.adapter.ts`** (`OverpassHotelAdapter`) — provider OSM alternatif (3 miroirs, `tourism=hotel/hostel/guest_house`), cache 5 min qui **ne met jamais en cache un résultat vide**. Sert de **secours** sur `/api/hotels/search` quand LiteAPI échoue ou ne renvoie rien (hôtels sans prix : « Prix indisponible »).

## API & utils

- `/api/hotels/search` → LiteAPI, tri `pricePerNight` croissant, puis chaîne de repli (hôtels déjà vus autour de la salle sans prix → Overpass → `[]`). Détails : [cache des APIs](../architecture/api-cache.md).
- `src/utils/hotel.ts` : `getHotelDistance(hotel, venue)` (haversine, `null` si inconnu) ; `deduplicateHotels` (fusion coord + nom flou, non câblé).

## Choix automatique (`src/utils/algorithms/recommend.ts`)

`pickHotel(hotels, salle, préférence)` (testé dans `src/__tests__/recommend.test.ts`) :
- ne garde que les hôtels avec un prix s'il y en a ;
- cherche d'abord à moins de 1,6 km de la salle (environ 20 min à pied), puis à moins de 5 km, puis partout ;
- **le plus rapide** : meilleure note (`rating`, sinon étoiles × 2), puis le plus proche ;
- **le moins cher** : plus petit prix par nuit ;
- **le plus vert** : le plus proche de la salle.

Aller-retour dans la journée : aucun hôtel n'est proposé ni recherché. L'écran Ton voyage (et Réserver) affiche une note « pas d'hôtel proposé » avec **Ajouter un hôtel**. Cet ajout (`hotelOptIn`) relance la recherche pour une nuit (`checkin` → lendemain) et peut être retiré. Un voyage déjà enregistré avec un hôtel le conserve.

## Choix manuel (`src/components/trip/HotelPicker.tsx`)

Ouvert par « Changer » sur le bloc Nuit (écran Ton voyage ou Réserver), dans un `Sheet` :
- tri **Recommandé** (le choix de `pickHotel` en tête) / **Plus proche** / **Moins cher**, rayon (`Dropdown`, 2 à 50 km) ;
- carte à la demande (`TravelMap` avec les hôtels du rayon ; un clic sur un marqueur choisit l'hôtel) ;
- chaque hôtel : photo LiteAPI, nom, étoiles, note, temps à pied (< 2,5 km) ou distance, conditions du tarif (« Annulation gratuite jusqu'au 9 déc. à 21h00 », « Non remboursable », « Annulation payante » si l'échéance est passée, puis la formule, ex. « Chambre seule »), prix par nuit, bouton **« Voir sur Booking »** (lien `getHotelBookingLink` aux dates du séjour, pour vérifier la disponibilité, événement PostHog `hotel_availability_opened`) et bouton « Choisir ». Libellés calculés par `hotelConditions` (`utils/fare-conditions.ts`), formules traduites via `fareConditionsConfig.hotelBoardLabels` ; un code inconnu n'est pas affiché.
- La réservation se fait depuis l'écran Réserver (« Réserver sur Booking.com », [booking-links.md](./booking-links.md)) ; arrivée affichée dès 14:00, départ avant 11:00.

## Type `HotelMapItem`

```ts
{ id, name, locationName, coords, stars?, website?, phone?, type?, photo?, pricePerNight?, currency?, rating?, source? }
```
