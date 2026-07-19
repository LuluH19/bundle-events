# Liens de réservation (deep-links)

[← Sommaire](../README.md)

Construits dans **`src/utils/booking.ts`**. `getBookingLinks(option, dep, arr, dateISO, { returnDateISO })` retourne **un lien par mode** présent dans le trajet. Les modes route/marche ne sont exposés que si tout le trajet est de ce mode.

## Par mode

| Mode | Cible | Détail |
|---|---|---|
| `plane` | **Kayak** (`/flights/{IATA}-{IATA}/{date}[/{retour}]`) | IATA via aéroport le plus proche (`constants/airports.ts`, < 80 km). Repli : Google Flights (recherche texte). |
| `train` | `/api/booking/train` → **Trainline** | Résout la gare → URN Trainline (serveur), redirige vers `/book/results`. Repli : Google Maps transit. |
| `bus` | `/api/booking/bus` → **FlixBus** | Résout la ville → UUID FlixBus, redirige vers `shop.flixbus.com/search` (date `DD.MM.YYYY`). Repli : Google Maps transit. |
| `car` / `walking` | **Google Maps** directions | Lien direct client (coords). |
| hôtel | **Booking.com** | `getHotelBookingLink` : dates **éclatées** `checkin_year/month/monthday`, `ss` = nom + ville, `lang=fr`, `EUR`. |

## Aller-retour (A/R)

Si `returnDateISO` est fourni, un mode ticketé devient un lien A/R (`roundTrip:true`) :
- **Avion** : Kayak avec dates aller + retour.
- **Train** : `/api/booking/train?...&returnDate=YYYY-MM-DD` → Trainline `journeySearchType=return` + `inwardDate={retour}T08:00:00` + `inwardDateType=departAfter` (**vérifié**).
- **Bus** : `/api/booking/bus?...&returnDate=YYYY-MM-DD` → FlixBus `returnDate` en `DD.MM.YYYY`.

Dans `BundleView`, un mode présent **dans les deux directions** est regroupé une seule fois en A/R dans l'en-tête (map `RT_HEADER`), retiré des cartes aller/retour.

## Pourquoi des proxys serveur pour train/bus

Trainline/FlixBus exigent un identifiant interne (URN/UUID) **non dérivable d'un nom** → résolution serveur (évite aussi le CORS). Seuls Kayak (IATA) et Google Maps (coords) marchent purement côté client.

Les liens sont **reconstruits depuis le snapshot** (noms + coords + dates), car il ne persiste ni IATA, ni IDs SNCF, ni horaires (voir [../database/schema.md](../database/schema.md)).
