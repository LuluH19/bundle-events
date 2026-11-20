# Analytics (PostHog)

PostHog est initialisé côté navigateur dans `src/instrumentation-client.ts` (voir [Vue d'ensemble](../architecture/overview.md#mesure-daudience)). Cette page liste les événements métier envoyés par l'application et décrit le dashboard qui les exploite.

Sans `POSTHOG_PROJECT_TOKEN` ou `POSTHOG_HOST`, PostHog n'est pas initialisé et les appels `posthog.capture` sont ignorés.

## Identification des utilisateurs

Aucun appel `posthog.identify` pour l'instant : l'application n'a pas encore de compte utilisateur. Tous les visiteurs restent anonymes.

## Événements

Les pages vues (`$pageview`), l'autocapture et les exceptions (`$exception`) sont gérées par le SDK. Les événements ci-dessous sont envoyés explicitement.

### Recherche (page d'accueil)

| Événement | Fichier | Propriétés |
|---|---|---|
| `departure_selected` | `BundleBuilder.tsx` | `source` (`search`) |
| `venue_selected` | `BundleBuilder.tsx` | `source` (`search` : champ de recherche, `home_ideas` : carte « Des idées de sortie »), `venue_provider` (`ticketmaster`, `mapbox`, `osm`, `opendata`), `city`, `has_date` |
| `event_ideas_filtered` | `views/HomeView.tsx` | `city` (ville choisie, ou `Toutes`) |
| `dates_selected` | `BundleBuilder.tsx` | `round_trip`, `same_day`, `nights` (nuits entre l'aller et le retour, 0 en aller simple ou dans la journée), `has_arrive_by`, `has_leave_after`. Envoyé seulement si les dates changent. |
| `bundle_composed` | `BundleBuilder.tsx` | `round_trip`, `same_day`, `hotel_nights`, `city`, `venue_provider`, `outbound_mode`, `return_mode`, `preference`, `estimated_total_eur` (arrondi, `null` si inconnu) |

`venue_provider` est déduit du préfixe de l'identifiant posé par `src/adapters/events` (`src/utils/analytics.ts`).

### Voyage

| Événement | Fichier | Propriétés |
|---|---|---|
| `preference_selected` | `BundleBuilder.tsx` | `preference` (`fast`, `cheap`, `green`) |
| `travel_option_selected` | `BundleBuilder.tsx` | `direction` (`outbound`, `return`), `transport_mode` |
| `hotel_selected` | `BundleBuilder.tsx` | `has_price`, `has_rating` |
| `hotel_opt_in` | `BundleBuilder.tsx` | `enabled` (ajout ou retrait de l'hôtel sur un aller-retour dans la journée) |
| `hotel_availability_opened` | `trip/HotelPicker.tsx` | `provider` (`Booking.com`) |

### Réservation

| Événement | Fichier | Propriétés |
|---|---|---|
| `transport_booking_opened` | `views/BookView.tsx` | `booking_type` (`round_trip`, `one_way`), `direction`, `provider`, `transport_mode` |
| `hotel_booking_opened` | `views/BookView.tsx` | `provider` |
| `booking_marked` | `BundleBuilder.tsx` | `item` (`outbound`, `hotel`, `return`), `booked` |

### Partage et sauvegarde

| Événement | Fichier | Propriétés |
|---|---|---|
| `bundle_link_copied` | `SaveBundleModal.tsx` | - |
| `bundle_shared` | `SaveBundleModal.tsx` | - |
| `bundle_email_saved` | `SaveBundleModal.tsx` | `email_sent` |
| `bundle_opened` | `BundleBuilder.tsx` | `step`, `round_trip`. Envoyé quand un bundle est chargé depuis Supabase (lien partagé, rechargement sans cache local). |

Côté serveur, `src/lib/posthog-logs.ts` envoie des **logs** OpenTelemetry (pas des événements) pour la création d'un bundle et la demande d'email.

## Dashboard « Bundle Events : parcours »

Dashboard à épingler et à définir comme dashboard d'accueil du projet. Il remplace « Analytics basics (wizard) ».

| Insight | Type | Définition | Tag |
|---|---|---|---|
| Parcours de réservation | Funnel (fenêtre 1 jour, ordre strict) | `$pageview` (chemin `/`), `venue_selected`, `departure_selected`, `dates_selected`, `bundle_composed`, `transport_booking_opened` ou `hotel_booking_opened` | `funnel` |
| Bundles composés | Trends, par jour | `bundle_composed`, ventilé par `round_trip` | `funnel` |
| Origine des événements | Trends, total | `venue_selected`, ventilé par `source` puis `venue_provider` | `acquisition` |
| Villes demandées | Trends, barres | `bundle_composed`, ventilé par `city` | `acquisition` |
| Modes de transport | Trends, camembert | `bundle_composed`, ventilé par `outbound_mode` | `booking` |
| Clics de réservation | Trends, barres | `transport_booking_opened` et `hotel_booking_opened`, ventilés par `provider` | `booking` |
| Partage et sauvegarde | Trends, par semaine | `bundle_link_copied`, `bundle_shared`, `bundle_email_saved` | `retention` |
| Retours sur un bundle | Trends, par semaine | `bundle_opened` | `retention` |
| Erreurs | Trends, par jour | `$exception` | `quality` |
