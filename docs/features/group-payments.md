# Paiements du groupe

[← Sommaire](../README.md)

La page récapitulative du bundle contient un tableau de bord permettant d'ajouter les participants, leur part et leur statut de paiement.

- Un changement de statut est reflété immédiatement dans l'interface puis sauvegardé par le mécanisme de persistance du bundle.
- Les compteurs « payés », « à relancer » et les montants sont recalculés à chaque modification.
- Le tableau de bord est accessible aux membres qui possèdent le lien privé et non indexé du bundle (`/{uuid}/bundle`). Le UUID agit comme jeton d'accès au groupe ; il ne doit pas être publié.
- Les anciens bundles restent compatibles : l'absence de `payments` équivaut à une liste vide.

## Rappels

Le bouton « Relancer les impayés » appelle `POST /api/bundles/{uuid}/reminders`. La route relit le snapshot côté serveur et filtre strictement les membres dont le statut vaut `unpaid` avant tout envoi. Un membre payé ne peut donc pas recevoir ce rappel, même si l'interface affichée dans un autre onglet est obsolète.

L'envoi utilise Brevo. Sans `BREVO_API_KEY`, la route fonctionne en mode stub et indique combien de rappels auraient été préparés, sans prétendre qu'ils ont été livrés.
