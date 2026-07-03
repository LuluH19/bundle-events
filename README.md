# Bundle Event

## Description

Bundle Events simplifie l'organisation de vos déplacements professionnels et personnels. Ne jonglez plus 
entre plusieurs onglets : réservez votre billet pour l'événement, votre hébergement et votre transport en une seule transaction.
 L'outil calcule les distances, le temps de trajet et les émissions de CO2 pour 
différents modes de transport.

## Fonctionnalités

- Calcul Multi-étapes : Planifiez votre trajet du point de départ à l'hôtel, puis de l'hôtel au lieu de l'événement.
- Comparaison de trajet : Comparez l'impact écologique entre la voiture, le train, le bus, l'avion ou la marche à pied.
- Visualisation Cartographique : Intégration de Mapbox pour afficher l'itinéraire en temps réel à travers la France.
- Bilan Carbone : Un récapitulatif clair des émissions totales en CO2.

## Installation

```shell
git clone git@github.com:LuluH19/bundle-events.git
cd bundle-events/
npm install
```

Lancer le sever de dev

```shell
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) avec votre navigateur.

## Conventional Commits

Le projet utilise le format [Conventional Commits](https://www.conventionalcommits.org/) pour standardiser les messages de commit.

### Format

```
<type>(<scope>): <subject>

[body optionnel]

[footer optionnel]
```

### Types autorisés

- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage, point-virgules manquants, etc. (pas de changement de code)
- `refactor` : Refactoring du code
- `perf` : Amélioration des performances
- `test` : Ajout ou modification de tests
- `build` : Changements du système de build
- `ci` : Changements de configuration CI
- `chore` : Tâches de maintenance
- `revert` : Annulation d'un commit précédent

### Exemples en ligne de commande par terminal

```bash
# ✅ Valides
git commit -m "feat: ajouter la fonctionnalité de connexion"
git commit -m "fix(client): corriger le bug de chargement"
git commit -m "docs: mettre à jour le README"
git commit -m "refactor: réorganiser le code d'authentification"
git commit -m "feat(auth): ajouter l'authentification OAuth

Implémente l'authentification via Google et GitHub"

# ❌ Invalides
git commit -m "ajouter fonctionnalité"  # Manque le type
git commit -m "Fix bug"  # Type en majuscule
git commit -m "feat: Ajouter fonctionnalité"  # Sujet en majuscule
```

Le workflow CI vérifie automatiquement le format des commits et bloque le merge si le format n'est pas respecté.