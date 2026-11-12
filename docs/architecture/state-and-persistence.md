# Architecture — État & persistance

[← Sommaire](../README.md)

Tout vit dans `src/components/BundleBuilder.tsx`.

## Snapshot

`buildSnapshot()` → `BundleSnapshot` : `departure, venue, checkin, checkout, roundTrip, outboundOption, returnOption, selectedHotel`, plus les champs optionnels ajoutés par la refonte :

| Champ | Rôle |
|---|---|
| `preference` | `"fast" \| "cheap" \| "green"`, ou `null` quand l'utilisateur a fait un choix manuel (« Choix personnalisé »). Absent → `"fast"`. |
| `arriveBy` | Heure « arriver avant » de l'aller (`HH:mm`), facultative. |
| `leaveAfter` | Heure « partir après » du retour (`HH:mm`), facultative. |
| `booked` | `{ outbound?, hotel?, return? }` : éléments marqués « J'ai réservé ». |

C'est l'unique objet persisté (JSONB) dans Supabase (voir [schéma](../database/schema.md)). Les anciens snapshots restent lisibles (champs optionnels). `checkin` / `checkout` sont désormais des dates `YYYY-MM-DD` ; une ancienne valeur avec heure est encore acceptée.

## Dérivés

- `sameDay` : aller-retour avec `checkout` = `checkin`. Le retour doit partir après l'arrivée.
- `withHotel` : forcé à `true` pour l'instant (`TODO #137`). Cible : `!sameDay` (pas d'hôtel ni de recherche d'hôtel pour un aller-retour dans la journée).
- `stayCheckout` : `checkout` si séjour, sinon `checkin + 1 jour` (aller simple ou aller-retour dans la journée).
- `tripTotal` (`utils/trip.ts`) : aller + hôtel × nuits + retour.

## Choix automatiques

- Trajets : à chaque calcul (`computeOptions`), on garde l'option déjà choisie si elle existe encore, sinon `pickOption(options, preference)`.
- Hôtel : à l'arrivée des résultats LiteAPI, si aucun hôtel n'est choisi, `pickHotel(résultats, salle, preference)`.
- Puce de préférence : re-choisit les trois éléments et retire le statut « réservé » de ceux qui changent.
- Choix manuel dans un panneau : `preference = null` et l'élément repasse « à réserver ».
- Changement de dates : l'hôtel est re-choisi pour les nouvelles dates et tous les statuts « réservé » sont remis à zéro.

## Hydratation

Au montage, `readTripCache(uuid)` (`src/utils/trip-cache.ts`, cache mémoire côté client) fournit l'état si on vient d'une autre étape de la même session : snapshot, options aller/retour, hôtels, horaires et les clés de calcul (`optionsKey`, `hotelsKey`, `outTimesKey`, `retTimesKey`). Les effets de calcul sautent la requête quand la clé n'a pas changé. Sinon (lien partagé, rechargement) : `fetchBundle(uuid)` recharge tout l'état. Bundle inexistant → redirection `/`.

## Persistance — deux mécanismes

1. **Débounce (600 ms)** : un `useEffect` sauve le snapshot via `updateBundle` 600 ms après tout changement (panneaux, préférences, « J'ai réservé »).
2. **Flush avant navigation** : `go()` écrit le cache (`writeTripCache`) et lance `updateBundle(uuid, buildSnapshot())` sans l'attendre, puis `router.push`. La sauvegarde débouncée étant annulée au démontage, ce flush garde Supabase à jour.

> **Règle générale** : toute action qui sélectionne quelque chose **puis navigue dans le même clic** doit persister la valeur explicitement avant `router.push` (ne pas compter sur `setState` + débounce). Depuis la refonte, les choix se font dans des panneaux sans navigation, donc ce cas ne se présente plus.
