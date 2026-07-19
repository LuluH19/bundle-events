# Parcours utilisateur (les 5 étapes)

[← Sommaire](../README.md)

Les écrans sont dans `src/components/views/`. Navigation et gating : voir [../architecture/routing-and-urls.md](../architecture/routing-and-urls.md).

## 01 — Home (`HomeView.tsx`)
- Autocomplétion du **départ** via Mapbox (`services/geocoding.ts`).
- Sélection de l'**évènement** parmi un dataset statique (`services/events.ts` → `LocalEventAdapter` → `utils/constants/venues.ts`).
- Dates check-in / check-out, toggle **aller-retour**.
- `onCompose` crée le bundle et route vers `/{id}/hotels`.

## 02 — Hôtels (`HotelsView.tsx`)
Détaillé dans [hotels.md](./hotels.md). En bref : liste + carte, filtres rayon/tri, « Vérifier la disponibilité » (Booking.com), et la **modale de détail** dont le CTA « Choisir ce logement et voir les transports » persiste l'hôtel puis navigue vers l'aller.

## 03 / 04 — Aller & Retour (`RoutesView.tsx`)
- Cartes d'options de transport par direction (`computeOptions`), libellés/icônes via `MODE_META` / `MODE_ICON`.
- Carte de l'itinéraire sélectionné + détail live (trains SNCF via `fetchTrainInfo`, vols via `fetchFlightInfo`).
- La 1ʳᵉ option est sélectionnée par défaut ; son détail s'enrichit en asynchrone. Les libellés sont **tronqués** pour éviter les décalages de layout qui feraient rater les clics sur les autres options.
- L'étape Retour est masquée en aller simple.

## 05 — Bundle (`BundleView.tsx`)
- Récap : leg aller, leg retour, hôtel, dates, total estimé.
- Liens de réservation via `getBookingLinks` (par mode) + `getHotelBookingLink` — voir [booking-links.md](./booking-links.md).
- Les modes **communs à l'aller ET au retour** (avion/train/bus) sont regroupés en **un seul lien A/R** dans l'en-tête, retirés des cartes aller/retour.
- Modification possible de chaque étape (`onEdit`).
- **Popup « Sauvegarder mon bundle »** — voir [save-and-email.md](./save-and-email.md).

## Layout (`src/components/layout/`)
- **`Header.tsx`** — barre supérieure sticky ; le logo est un simple **lien vers `/`** (accueil). (Blocs nav/CTA laissés en commentaire pour usage futur.)
- **`SideNav.tsx`** — rail gauche desktop (`lg:`). Items : **Dates & Events** (étape `home` — revient au bundle courant avec ses infos), Mon logement, Trajet aller, Trajet retour, Mon Bundle final. Masque `routes-return` si `!roundTrip`, gaté par `canReach`.
- **`MobileTabBar.tsx`** — barre d'onglets mobile en bas, mêmes items (**Dates**, Logement, Aller, Retour, Bundle) + gating.
