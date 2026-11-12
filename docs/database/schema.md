# Base de données — Schéma Supabase

[← Sommaire](../README.md)

Persistance via **Supabase** (PostgreSQL). Tables : **`bundles`**, plus **`api_cache`** et **`api_usage`** pour le [cache des APIs](../architecture/api-cache.md). Tout l'accès passe par le **client service-role serveur** (`src/lib/supabase/server.ts` → `getSupabaseAdmin`, mémoïsé), jamais depuis le navigateur.

> `bundles` n'a pas de migration (schéma créé à la main). Le cache des APIs a la sienne : `supabase/migrations/20261112000000_api_cache.sql`, à exécuter une fois dans l'éditeur SQL Supabase. Sans elle, le cache fonctionne en mémoire seule.

## Table `bundles`

| Colonne | Type | Rôle |
|---|---|---|
| `uuid` | uuid | identifiant public (dans l'URL `/{uuid}/...`) |
| `email` | text | email de sauvegarde (nullable) |
| `data` | jsonb | `BundleSnapshot` |
| `created_at` | timestamptz | date de création |
| `updated_at` | timestamptz | date de mise à jour |
| (id interne) | bigint | non exposé |

### Contenu de `data` (`BundleSnapshot`)

```ts
{
  departure: Location | null
  venue: Location | null
  checkin: string
  checkout: string
  roundTrip: boolean
  outboundOption: RouteOption | null
  returnOption: RouteOption | null
  selectedHotel: HotelMapItem | null
}
```

Le snapshot ne stocke **que** des noms de lieux + coordonnées + mode. Il ne persiste **pas** les codes IATA, IDs de gare SNCF, ni horaires — récupérés en live à l'étape trajets puis abandonnés. Les liens de réservation sont reconstruits à partir des noms/coords + dates ([../features/booking-links.md](../features/booking-links.md)).

## Table `api_cache`

| Colonne | Type | Rôle |
|---|---|---|
| `key` | text (PK) | `<fournisseur>:<requête normalisée>`, sans secret |
| `provider` | text | `sncf`, `liteapi`, `travelpayouts`, `overpass` |
| `payload` | jsonb | réponse déjà mappée (types internes) |
| `expires_at` | timestamptz | fin de fraîcheur ; la ligne reste ensuite comme repli périmé |
| `updated_at` | timestamptz | dernière écriture (index, purge) |

`purge_api_cache(interval default '30 days')` supprime les lignes non rafraîchies depuis cet intervalle (à planifier avec pg_cron si disponible).

## Table `api_usage`

| Colonne | Type | Rôle |
|---|---|---|
| `provider` | text | fournisseur |
| `day` | date | jour UTC |
| `calls` | integer | appels réels au fournisseur (hors cache) |

Clé primaire `(provider, day)`. Incrémentée par `increment_api_usage(p_provider)` (renvoie le total du jour), qui sert aussi aux quotas `API_DAILY_LIMIT_*`. Pour suivre la consommation : `select * from api_usage order by day desc;`.

## Accès & sécurité

- Écriture/lecture uniquement via `/api/bundles/*` ([../api/internal-routes.md](../api/internal-routes.md)).
- **RLS activé sans policy** sur les trois tables → clés anon/publiques verrouillées ; seule la clé service-role (serveur) lit/écrit. Les deux fonctions ne sont exécutables que par `service_role`.
- `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais porter le préfixe `NEXT_PUBLIC_`.

Cycle de persistance : voir [../architecture/state-and-persistence.md](../architecture/state-and-persistence.md).
