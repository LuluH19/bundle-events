# Architecture : cache des APIs & fallbacks

[← Sommaire](../README.md)

Issue #153 : consommer moins de tokens sur les APIs payantes ou limitées, et garder le site utilisable quand l'une d'elles tombe.

## Principe

Un **cache partagé entre tous les utilisateurs**, côté serveur. Le premier utilisateur qui demande une donnée paie l'appel ; les suivants (même salle, mêmes gares, mêmes dates) la reçoivent depuis le cache. On ne précharge rien à l'avance.

`src/lib/api-cache.ts` → `cached({ provider, key, ttlMs, staleMs, fetcher, shouldStore? })` :

1. **Mémoire** (par instance, 500 entrées max, la plus ancienne sort en premier).
2. **Supabase `api_cache`** (partagé entre instances, survit aux démarrages à froid). Lecture limitée à 1,5 s.
3. **Appel au fournisseur** (`fetcher`). Les requêtes identiques simultanées partagent un seul appel.

Règles :

- Un résultat vide n'est **jamais** mis en cache (une panne passagère ne doit pas masquer des données).
- Le `fetcher` doit **lever une erreur** en cas d'échec (pas renvoyer `[]`), sinon le repli ne se déclenche pas.
- **Repli périmé** : si le fournisseur échoue, dépasse son quota ou a son disjoncteur ouvert, la dernière entrée connue est servie même expirée, tant qu'elle a moins de `staleMs` de retard. Sinon `UpstreamUnavailableError`.
- **Disjoncteur** par fournisseur : 3 échecs consécutifs → plus d'appel pendant 60 s.
- **Quota journalier** optionnel par fournisseur (`API_DAILY_LIMIT_*`, voir [environnement](../getting-started/environment.md)). Chaque appel réel est compté dans `api_usage`, même sans limite.
- Si Supabase est absent ou la table pas encore créée, le cache passe en **mémoire seule** (un avertissement `[api-cache]` dans les logs, nouvel essai toutes les 5 min).
- `prime()` écrit une valeur calculée ailleurs, `peek()` lit sans jamais appeler le fournisseur (utilisés par le repli hôtels).

Chaque route renvoie l'en-tête `X-Cache: hit | miss | stale`. Les dégradations (`error`, `quota`, `circuit_open`) sont envoyées à PostHog Logs (`logApiDegraded`, au plus une par fournisseur et par raison chaque minute).

## Durées (`src/config/api-cache.ts`)

| Donnée | Route | Frais | Repli périmé |
|---|---|---|---|
| Gares SNCF (toutes) | `/api/stations` | 7 j | 30 j |
| Géométrie ferroviaire | `/api/trains/route-geometry` | 7 j | 30 j |
| Horaires SNCF (avec `datetime`) | `/api/trains/search` | 10 min | 2 h |
| Trajets SNCF sans `datetime` (durées, interdiction vols courts) | `/api/trains/search` | 6 h | 30 j |
| Vols Travelpayouts | `/api/flights/search` | 3 h | 24 h |
| Tarifs LiteAPI | `/api/hotels/search` | 1 h | 24 h |
| Hôtels vus par LiteAPI autour d'une salle (sans prix) | `/api/hotels/search` | 30 j | 30 j |
| Hôtels OSM (Overpass) | `/api/hotels/search` | 7 j | 30 j |

Clés : coordonnées arrondies à 3 décimales (~110 m) pour que des recherches voisines partagent l'entrée ; jamais de token ni de clé dans une clé de cache.

## Fallbacks par fonctionnalité

- **Hôtels** : tarifs LiteAPI (frais, cache ou périmé) → hôtels déjà vus par LiteAPI autour de la salle pour d'autres dates, sans prix → OSM via Overpass (5 km max, 3 miroirs interrogés en parallèle, 25 s) → liste vide. En-tête `X-Data-Source: liteapi | liteapi-venue | overpass | none`. Sans prix, l'UI affiche « Prix indisponible ».
- **Trains** : SNCF → copie périmée → `503 { journeys: [], degraded: true }`. Le client garde son repli OpenRailRouting pour la géométrie et les estimations.
- **Vols** : Travelpayouts → copie périmée → `503 { flights: [], degraded: true }` (l'option avion reste calculée sans horaires).
- **Gares** : SNCF → copie périmée → `503`. Une page en échec invalide toute la liste (jamais de liste partielle en cache).

## Côté client

- `routing.ts` : plus de paramètre anti-cache `t=Date.now()` sur `route-geometry`.
- `isShortHaulFlightBanned` : la durée rail est mémorisée par paire de villes (~1 km) pour la session ; un échec n'est pas mémorisé.

## Base

Tables `api_cache` et `api_usage`, fonctions `increment_api_usage` et `purge_api_cache` : voir [schéma](../database/schema.md).
