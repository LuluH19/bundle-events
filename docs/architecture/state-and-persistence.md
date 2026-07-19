# Architecture — État & persistance

[← Sommaire](../README.md)

Tout vit dans `src/components/BundleBuilder.tsx`.

## Snapshot

`buildSnapshot()` → `BundleSnapshot` : `departure, venue, checkin, checkout, roundTrip, outboundOption, returnOption, selectedHotel`. C'est l'unique objet persisté (JSONB) dans Supabase (voir [schéma](../database/schema.md)).

## Hydratation

Au montage, si `uuid` présent et non hydraté : `fetchBundle(uuid)` recharge tout l'état (départ, venue, dates, options, hôtel). Bundle inexistant → redirection `/`.

## Persistance — deux mécanismes

1. **Débounce (600 ms)** : un `useEffect` sauve le snapshot via `updateBundle` 600 ms après tout changement. Sert aux modifications « en place » (dates, rayon, options) sans navigation.
2. **Flush avant navigation** : `go()` fait `await updateBundle(uuid, buildSnapshot())` **avant** `router.push`. Indispensable car la sauvegarde débouncée est annulée au démontage — sans ce flush, la dernière modification serait perdue au changement d'étape.

## Cas hôtel (règle importante)

`handleChooseHotel(hotel)` : le modal hôtel sélectionne l'hôtel **et** navigue dans le même clic. Comme `setState` est **asynchrone**, l'hôtel n'est pas encore dans `buildSnapshot()` au moment de la navigation. Ce handler persiste donc explicitement `{ ...buildSnapshot(), selectedHotel: hotel }` avant `router.push('/{uuid}/routes-outbound')`.

Sans cela : `selectedHotel` nul sur les pages suivantes → « aucun hôtel sélectionné » **et** étapes Aller/Retour injoignables (car `hotels` incomplète bloque `canReach`).

> **Règle générale** : toute action qui sélectionne quelque chose **puis navigue dans le même clic** doit persister la valeur explicitement avant `router.push` (ne pas compter sur `setState` + débounce).
