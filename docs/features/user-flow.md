# Parcours utilisateur (3 écrans)

[← Sommaire](../README.md)

Principe : **on montre un voyage complet avant de demander des choix**. L'utilisateur donne son départ, son événement et ses dates ; on assemble l'aller, l'hôtel et le retour selon un critère (le plus rapide par défaut). Tout reste modifiable via des panneaux « Changer », sans quitter la page.

Les écrans sont dans `src/components/views/`. Navigation : voir [../architecture/routing-and-urls.md](../architecture/routing-and-urls.md).

## 1 — Recherche (`HomeView.tsx`, `/` ou `/{uuid}`)
- Barre de recherche : **départ** (autocomplétion API Adresse → Mapbox → Nominatim, `services/geocoding.ts`), **événement** (`services/events.ts` → `/api/events/search`), **dates** (bouton qui ouvre `DateRangePicker`), puis **« Voir mon voyage »**. Navigation clavier dans les suggestions (flèches, Entrée, Échap).
- Pas de bascule Aller-retour / Aller simple : depuis l'accueil, le type de trajet se déduit du calendrier (`onRoundTripChange` appelé à la validation) : un seul jour choisi = aller simple, deux jours = aller-retour.
- Trois cartes d'arguments (une recherche, voyage modifiable, lien à partager), sans titre ni mention de zone.
- « Des idées de sortie » : affiche par défaut (puce « Toutes ») jusqu'à 8 concerts, festivals, spectacles ou matchs à venir, répartis entre les 7 villes proposées (`searchEventIdeas` → `/api/events/search?cities=`). Une puce de ville filtre sur cette ville (résultats situés dans la ville uniquement, `isInCity`) ; recliquer dessus revient à « Toutes ». Les résultats sont gardés en mémoire par puce : pas de nouvel appel quand on revient sur une puce déjà vue. Un clic sur une carte choisit l'événement.
- `onCompose` crée le bundle (`createBundle`) puis route vers `/{id}/voyage`. Avec un uuid existant, on retourne simplement à `voyage`. Pendant ce temps, l'écran de chargement (`LoadingScreen`, logo animé `LogoLoader`) couvre la page.
- Les trajets et hôtels calculés sur l'accueil sont transmis à la page voyage via `utils/trip-cache.ts` : pas de rechargement Supabase ni de nouveau calcul. Si les trajets ne sont pas encore prêts, la page voyage affiche l'écran de chargement jusqu'à leur arrivée.

### Calendrier (`src/components/DateRangePicker.tsx`)
- Sélection directe sur le calendrier, sans boutons Aller / Retour (retours utilisateurs : on tape sur le calendrier sans regarder les boutons). Premier jour touché = aller ; au survol, la plage jusqu'au jour pointé s'affiche (bande claire, jour de retour cerclé) ; le jour suivant touché (même jour ou après) = retour. Toucher un jour avant l'aller, ou un jour quand les deux dates sont posées, recommence à l'aller. Une ligne au-dessus du calendrier guide : « Touche le jour de l'aller, puis celui du retour », puis « Aller … · touche le jour du retour, ou valide pour un aller simple », puis « Aller … · retour … ». Bouton : « Valider · aller simple » avec un seul jour (accueil), « Valider les dates » avec deux. Sur Ton voyage, le type de trajet reste celui du bundle : un aller-retour exige les deux dates (« Choisis le jour du retour »).
- Un seul calendrier en plage aller → retour, navigation entre mois, jours passés barrés et non cliquables, aujourd'hui entouré. Légende : seulement « Date de l'événement » quand l'événement a des dates.
- Le retour peut être **le même jour** que l'aller : aller-retour dans la journée. Aucun hôtel n'est proposé (message du calendrier : « Pas d'hôtel proposé, tu pourras en ajouter un si tu veux. »). Sur Ton voyage, une note remplace le bloc Nuit, avec **Ajouter un hôtel** ; **Retirer** revient à l'aller-retour sans logement.
- Heures **facultatives** : « Aller · arriver avant » et « Retour · partir après », saisie au clavier ou créneaux.
- Règles : une heure déjà passée aujourd'hui est barrée et bloque « Valider » ; un retour le même jour doit partir après l'arrivée.
- Calcul des heures de recherche : `outboundSearch` / `returnSearch` dans `src/utils/date.ts` (testés). Sans heure : départs à partir de maintenant si la date est aujourd'hui, sinon départs du matin (08:00) ; retour après 10:00.

## 2 — Ton voyage (`TripView.tsx`, `/{uuid}/voyage`)
- Titre « Départ → Événement », dates, lien « Modifier la recherche ».
- Puces **Le plus rapide / Le moins cher / Le plus vert** : re-choisissent l'aller, le retour et l'hôtel (`pickOption`, `pickHotel` dans `utils/algorithms/recommend.ts`).
- Blocs **Aller**, **Nuit** (ou, pour un aller-retour le même jour, une note sans hôtel et **Ajouter un hôtel**), **Retour**. La nuit ajoutée ce jour-là a aussi **Retirer**. La date et l'heure exacte de départ sont affichées pour l'aller et le retour (en-tête de bloc et faits marquants). « Changer » ouvre un panneau (`components/trip/TripPanels.tsx`) :
  - aller / retour : `OptionList` (cartes avec badges, durée, changements, CO₂, barre des modes) ;
  - hôtel : `HotelPicker` (tri recommandé / plus proche / moins cher, rayon, carte à la demande).
- Détail d'un trajet repliable : segments colorés par mode avec heure exacte de départ et d'arrivée sur chaque segment, « Changement à … » avec temps d'attente en correspondance visible, horaires SNCF du jour si disponibles (`fetchTrainInfo`) avec temps de correspondance entre trains.
- Ordinateur : colonne de droite avec la progression (`StepsColumn`), le total + « Réserver » (juste sous la progression, détail Aller · Hôtel · Retour sous le total, chaque montant insécable pour que « € » ne passe jamais seul à la ligne) puis la carte (`TripMap`, bascule Aller/Retour, légende, échelle). Bouton « Agrandir » en haut à gauche de la carte → carte plein écran (`TripMapDialog`, fermeture par « Fermer » ou Échap). Mobile : progression en haut, bouton « Voir sur la carte » qui ouvre directement la carte plein écran, barre fixe « Total + Réserver » en bas. Le cadrage de la carte inclut le tracé complet (détours compris).
- Détail d'un trajet (`SegmentList`) et feuille de route : l'étiquette du transport est au-dessus du trajet « départ → arrivée », sur tous les écrans, avec heure de départ et d'arrivée pour chaque segment et temps d'attente en correspondance visibles.

## 3 — Réserver (`BookView.tsx`, `/{uuid}/reserver`)
- Grille 2 colonnes : **l'événement** (photo, critère choisi, addition Aller + Hôtel + Retour = total, « Modifier les dates »), **la nuit** (absente pour un aller-retour le même jour : note + **Ajouter un hôtel** ; **Retirer l'hôtel** si on en a ajouté un), **l'aller**, **le retour**. Une carte seule sur sa ligne prend toute la largeur. Mobile : une colonne dans l'ordre événement, aller, nuit, retour.
- Chaque carte affiche les détails du choix et un bouton **« Réserver sur {vendeur} ↗ »** (liens de [booking-links.md](./booking-links.md)) ; un mode présent à l'aller et au retour est réservé en une fois sur la carte Aller.
- **« J'ai réservé »** marque l'élément (persisté dans `booked`) ; « Modifier » ouvre le même panneau que sur « Ton voyage » et remet l'élément à réserver.
- Progression « x sur n réservés » en pleine largeur sous la grille.
- Colonne de droite : progression, carte, feuille de route par jour. Chaque trajet y est replié en une ligne « départ → icônes des transports → arrivée » (modes consécutifs identiques fusionnés, marches de 0 min ignorées) avec la durée ; on déplie pour voir toutes les étapes. Bouton flottant **« Partager »** → [save-and-email.md](./save-and-email.md).

## Layout
- **`Header.tsx`** — logo (lien vers `/`) et, à droite, le bouton « Projet étudiant » (`StudentProjectNotice`) : une fenêtre explique que c’est un projet étudiant et propose « Donner mon avis », qui ouvre le formulaire Google.
- Les anciens `SideNav` / `MobileTabBar` et les vues `HotelsView`, `RoutesView`, `BundleView` ont été supprimés.
