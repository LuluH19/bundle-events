# Parcours utilisateur (3 écrans)

[← Sommaire](../README.md)

Principe : **on montre un voyage complet avant de demander des choix**. L'utilisateur donne son départ, son événement et ses dates ; on assemble l'aller, l'hôtel et le retour selon un critère (le plus rapide par défaut). Tout reste modifiable via des panneaux « Changer », sans quitter la page.

Les écrans sont dans `src/components/views/`. Navigation : voir [../architecture/routing-and-urls.md](../architecture/routing-and-urls.md).

## 1 — Recherche (`HomeView.tsx`, `/` ou `/{uuid}`)
- Barre de recherche : **départ** (autocomplétion Mapbox, `services/geocoding.ts`), **événement** (`services/events.ts`), **dates** (bouton qui ouvre `DateRangePicker`), puis **« Voir mon voyage »**. Navigation clavier dans les suggestions (flèches, Entrée, Échap).
- Bascule **Aller-retour / Aller simple** sous la barre.
- Bloc « Pourquoi pas Google Maps + Booking ? » (3 arguments) et mention de la zone couverte (France métropolitaine).
- « Des idées de sortie » : puces de villes ; un clic lance `searchEvents(ville)` et affiche des cartes cliquables qui choisissent l'événement.
- `onCompose` crée le bundle (`createBundle`) puis route vers `/{id}/voyage`. Avec un uuid existant, on retourne simplement à `voyage`. Pendant ce temps, l'écran de chargement (`LoadingScreen`, logo animé `LogoLoader`) couvre la page.
- Les trajets et hôtels calculés sur l'accueil sont transmis à la page voyage via `utils/trip-cache.ts` : pas de rechargement Supabase ni de nouveau calcul. Si les trajets ne sont pas encore prêts, la page voyage affiche l'écran de chargement jusqu'à leur arrivée.

### Calendrier (`src/components/DateRangePicker.tsx`)
- Un seul calendrier en plage aller → retour, navigation entre mois, jours passés barrés et non cliquables, aujourd'hui entouré. Légende : seulement « Date de l'événement » quand l'événement a des dates.
- Le retour peut être **le même jour** que l'aller : aller-retour dans la journée. **Temporaire** : un hôtel (1 nuit) reste proposé ; la suppression de l'hôtel (ticket #137) est commentée dans `BundleBuilder.tsx` (`withHotel`), `DateRangePicker.tsx` et `TripView.tsx` (`TODO #137`).
- Heures **facultatives** : « Aller · arriver avant » et « Retour · partir après », saisie au clavier ou créneaux.
- Règles : une heure déjà passée aujourd'hui est barrée et bloque « Valider » ; un retour le même jour doit partir après l'arrivée.
- Calcul des heures de recherche : `outboundSearch` / `returnSearch` dans `src/utils/date.ts` (testés). Sans heure : départs à partir de maintenant si la date est aujourd'hui, sinon départs du matin (08:00) ; retour après 10:00.

## 2 — Ton voyage (`TripView.tsx`, `/{uuid}/voyage`)
- Titre « Départ → Événement », dates, lien « Modifier la recherche ».
- Puces **Le plus rapide / Le moins cher / Le plus vert** : re-choisissent l'aller, le retour et l'hôtel (`pickOption`, `pickHotel` dans `utils/algorithms/recommend.ts`).
- Blocs **Aller**, **Nuit** (ou note « aller-retour dans la journée »), **Retour** ; chacun a « Changer » qui ouvre un panneau (`components/trip/TripPanels.tsx`) :
  - aller / retour : `OptionList` (cartes avec badges, durée, changements, CO₂, barre des modes) ;
  - hôtel : `HotelPicker` (tri recommandé / plus proche / moins cher, rayon, carte à la demande).
- Détail d'un trajet repliable : segments colorés par mode, « Changement à … », horaires SNCF du jour si disponibles (`fetchTrainInfo`).
- Ordinateur : colonne de droite avec la progression (`StepsColumn`), le total + « Réserver » (juste sous la progression, détail Aller · Hôtel · Retour sous le total, chaque montant insécable pour que « € » ne passe jamais seul à la ligne) puis la carte (`TripMap`, bascule Aller/Retour, légende, échelle). Bouton « Agrandir » en haut à gauche de la carte → carte plein écran (`TripMapDialog`, fermeture par « Fermer » ou Échap). Mobile : progression en haut, bouton « Voir sur la carte » qui ouvre directement la carte plein écran, barre fixe « Total + Réserver » en bas. Le cadrage de la carte inclut le tracé complet (détours compris).
- Détail d'un trajet (`SegmentList`) et feuille de route : l'étiquette du transport est au-dessus du trajet « départ → arrivée », sur tous les écrans, pour que les noms longs (ex. « Intercités de nuit Paris Austerlitz - Tarbes ») ne compriment plus le texte.

## 3 — Réserver (`BookView.tsx`, `/{uuid}/reserver`)
- Grille 2 colonnes : **l'événement** (photo, critère choisi, addition Aller + Hôtel + Retour = total, « Modifier les dates »), **la nuit**, **l'aller**, **le retour**. Une carte seule sur sa ligne prend toute la largeur. Mobile : une colonne dans l'ordre événement, aller, nuit, retour.
- Chaque carte affiche les détails du choix et un bouton **« Réserver sur {vendeur} ↗ »** (liens de [booking-links.md](./booking-links.md)) ; un mode présent à l'aller et au retour est réservé en une fois sur la carte Aller.
- **« J'ai réservé »** marque l'élément (persisté dans `booked`) ; « Modifier » ouvre le même panneau que sur « Ton voyage » et remet l'élément à réserver.
- Progression « x sur n réservés » en pleine largeur sous la grille.
- Colonne de droite : progression, carte, feuille de route par jour. Chaque trajet y est replié en une ligne « départ → icônes des transports → arrivée » (modes consécutifs identiques fusionnés, marches de 0 min ignorées) avec la durée ; on déplie pour voir toutes les étapes. Bouton flottant **« Partager »** → [save-and-email.md](./save-and-email.md).

## Layout
- **`Header.tsx`** — logo (lien vers `/`) uniquement.
- Les anciens `SideNav` / `MobileTabBar` et les vues `HotelsView`, `RoutesView`, `BundleView` ont été supprimés.
