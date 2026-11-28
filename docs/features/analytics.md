# Analytics (PostHog)

PostHog est initialisé côté navigateur dans `src/instrumentation-client.ts` (voir [Vue d'ensemble](../architecture/overview.md#mesure-daudience)). Cette page liste les événements métier envoyés par l'application et décrit les dashboards qui les exploitent.

Sans `POSTHOG_PROJECT_TOKEN` ou `POSTHOG_HOST`, PostHog n'est pas initialisé et les appels `posthog.capture` sont ignorés.

## Identification des utilisateurs

Aucun appel `posthog.identify` pour l'instant : l'application n'a pas encore de compte utilisateur. Tous les visiteurs restent anonymes.

## Événements

Les événements automatiques du SDK sont décrits plus bas. Les événements ci-dessous sont envoyés explicitement.

### Recherche (page d'accueil)

| Événement | Fichier | Propriétés |
|---|---|---|
| `departure_selected` | `BundleBuilder.tsx` | `source` (`search`) |
| `venue_selected` | `BundleBuilder.tsx` | `source` (`search` : champ de recherche, `home_ideas` : carte « Des idées de sortie », `events_page` : carte de la page `/evenements`), `venue_provider` (`ticketmaster`, `mapbox`, `osm`, `opendata`), `city`, `has_date` |
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

## Collecte automatique du SDK

Configurée dans `src/instrumentation-client.ts` :

- pages vues et pages quittées, autocapture des clics, exceptions ;
- heatmaps (`capture_heatmaps`), dead clicks (`capture_dead_clicks`) ;
- web vitals et timings réseau (`capture_performance`).

Le replay de session s'active dans les réglages du projet PostHog (Settings, Session replay), pas dans le code.

### Reverse proxy `/ingest`

Le SDK envoie ses requêtes à `/ingest` sur le domaine du site, et `next.config.ts` les réécrit vers `POSTHOG_HOST` (et vers l'hôte `-assets` pour `/ingest/static` et `/ingest/array`). Les bloqueurs de publicité ne voient donc pas `posthog.com`, ce qui évite de perdre une partie du trafic. `skipTrailingSlashRedirect` est activé car l'API PostHog utilise des slashs finaux.

## Dashboards PostHog

Les deux dashboards sont épinglés dans le projet. Tous les insights excluent `localhost` et les IP locales (filtre `$host`). Les définitions complètes ont été créées via l'API PostHog.

### « Bundle Events : Trafic »

D'où viennent les visiteurs.

| Insight | Définition |
|---|---|
| Visiteurs et sessions par jour | `$pageview` : visiteurs uniques et sessions uniques |
| Canaux d'acquisition | Sessions ventilées par `$channel_type` (Direct, Organic Social, Referral, Email, Search...) |
| Sites référents | Visiteurs ventilés par `$referring_domain` |
| Campagnes UTM | Sessions ventilées par `$entry_utm_source` |
| Pays des visiteurs | Carte, `$geoip_country_code` |
| Villes des visiteurs | `$geoip_city_name` |
| Appareils | `$device_type` |
| Navigateurs | `$browser` |
| Pages d'entrée | Sessions ventilées par `$entry_pathname` |
| Durée moyenne de session | Moyenne de `$session_duration` |
| Nouveaux et récurrents | Lifecycle hebdomadaire sur `$pageview` |

Pour suivre une campagne, ajouter `?utm_source=<réseau>&utm_campaign=<nom>` aux liens partagés (LinkedIn, Instagram, emails).

### « Bundle Events : Comportement »

Ce que font les visiteurs sur le site.

| Insight | Définition |
|---|---|
| Parcours de réservation | Funnel sur 1 jour : `$pageview` sur `/`, `venue_selected`, `departure_selected`, `bundle_composed`, `transport_booking_opened` |
| Conversion par source | Funnel `$pageview` sur `/` puis `bundle_composed`, ventilé par `$referring_domain` |
| Bundles composés | `bundle_composed` par jour, ventilé par `round_trip` |
| Événements choisis par ville | `venue_selected` ventilé par `city` |
| Origine du choix d'événement | `venue_selected` ventilé par `source` |
| Préférences de voyage | `preference_selected` ventilé par `preference` |
| Clics de réservation transport | `transport_booking_opened` ventilé par `transport_mode` |
| Clics de réservation par fournisseur | `transport_booking_opened` et `hotel_booking_opened` ventilés par `provider` |
| Partage et sauvegarde | `bundle_link_copied`, `bundle_shared`, `bundle_email_saved` par semaine |
| Rétention des créateurs de bundle | Rétention hebdomadaire : premier `bundle_composed`, puis retour (`$pageview`) |
| Chemins de navigation | Paths sur `$pageview`, identifiants de bundle regroupés sous `/:bundle` |
| Frustration | `$rageclick` et `$dead_click` ventilés par `$pathname` |
| Erreurs JavaScript | `$exception` par jour |
| Web vitals (p75) | LCP et INP, 75e percentile de `$web_vitals` |

Les propriétés ajoutées par l'issue #185 (`city`, `source`, `venue_provider`...) n'apparaissent qu'après le déploiement : les données plus anciennes tombent dans la valeur vide.
