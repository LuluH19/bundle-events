# Liens de réservation (deep-links)

[← Sommaire](../README.md)

Construits dans **`src/utils/booking.ts`**. `getBookingLinks(option, dep, arr, dateISO, { returnDateISO })` retourne **un lien par mode** présent dans le trajet. Les modes route/marche ne sont exposés que si tout le trajet est de ce mode.

## Par mode

| Mode | Cible | Détail |
|---|---|---|
| `plane` | **Kayak** (`/flights/{IATA}-{IATA}/{date}[/{retour}]`) | IATA via aéroport le plus proche (`constants/airports.ts`, < 80 km). Repli : Google Flights (recherche texte). |
| `train` | `/api/booking/train` → **Trainline** | Résout la gare → URN Trainline (serveur), redirige vers `/book/results` avec un passager adulte (`passengers[]=1995-01-01`, obligatoire sinon Trainline affiche une erreur). Repli : Google Maps transit. |
| `bus` | `/api/booking/bus` → **FlixBus** | Résout la ville → UUID FlixBus, redirige vers `shop.flixbus.com/search` (date `DD.MM.YYYY`). Repli : Google Maps transit. |
| `car` / `walking` | **Google Maps** directions | Lien direct client (coords). |
| hôtel | **Booking.com** (page Réserver, et bouton « Voir sur Booking » de chaque hôtel dans « Changer d'hôtel ») | `getHotelBookingLink` : dates **éclatées** `checkin_year/month/monthday`, `ss` = nom + ville, `lang=fr`, `EUR`. |

## Aller-retour (A/R)

Si `returnDateISO` est fourni, un mode ticketé devient un lien A/R (`roundTrip:true`) :
- **Avion** : Kayak avec dates aller + retour.
- **Train** : `/api/booking/train?...&returnDate=YYYY-MM-DD` → Trainline `journeySearchType=return` + `inwardDate={retour}T08:00:00` + `inwardDateType=departAfter` (**vérifié**).
- **Bus** : `/api/booking/bus?...&returnDate=YYYY-MM-DD` → FlixBus `returnDate` en `DD.MM.YYYY`.

Dans `BookView`, un mode présent **dans les deux directions** est réservé une seule fois en A/R depuis la carte **Aller** (« Réserver sur Trainline (aller-retour) ») ; la carte Retour indique alors « Inclus dans la réservation aller-retour ».

## Pourquoi des proxys serveur pour train/bus

Trainline/FlixBus exigent un identifiant interne (URN/UUID) **non dérivable d'un nom** → résolution serveur (évite aussi le CORS). Seuls Kayak (IATA) et Google Maps (coords) marchent purement côté client.

Les liens sont **reconstruits depuis le snapshot** (noms + coords + dates), car il ne persiste ni IATA, ni IDs SNCF, ni horaires (voir [../database/schema.md](../database/schema.md)).

## Conditions tarifaires (#148)

Affichées sur les cartes de la page Réserver (`BookView`).

- **Hôtel** : conditions du tarif LiteAPI (annulation, formule) sous le prix, avec « Conditions du tarif trouvé, à confirmer sur Booking.com avant de payer » : le lien ouvre Booking.com, dont le tarif peut différer. Sans information de LiteAPI : « Conditions d'annulation à vérifier sur Booking.com ».
- **Train / car** : aucune API ne donne les conditions d'un billet. Chaque carte affiche « Échange et annulation : conditions SNCF ↗ / conditions FlixBus ↗ », liens définis dans `config/fare-conditions.ts` (`fareConditionsConfig.transport`) et choisis par `transportConditions(option)` selon les modes du trajet.
- **Avion** : la compagnie n'est pas connue avant la recherche Kayak : « selon la compagnie aérienne, affichées sur Kayak ».
