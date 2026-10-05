# Paiements du groupe

[← Sommaire](../README.md)

La page récapitulative du bundle contient un tableau de bord permettant d'ajouter les participants, leur part et leur statut de paiement.

- Un changement de statut est reflété immédiatement dans l'interface puis sauvegardé par le mécanisme de persistance du bundle.
- Les compteurs « payés », « à relancer » et les montants sont recalculés à chaque modification.
- Le tableau de bord est accessible aux membres qui possèdent le lien privé et non indexé du bundle (`/{uuid}/bundle`). Le UUID agit comme jeton d'accès au groupe ; il ne doit pas être publié.
- Les anciens bundles restent compatibles : l'absence de `payments` équivaut à une liste vide.
