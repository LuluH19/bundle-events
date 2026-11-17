# Base de données — Schéma Supabase

[← Sommaire](../README.md)

Persistance via **Supabase** (PostgreSQL). Une seule table : **`bundles`**. Tout l'accès passe par le **client service-role serveur** (`src/lib/supabase/server.ts` → `getSupabaseAdmin`, mémoïsé), jamais depuis le navigateur.

> Le schéma de base de `bundles` est implicite (créé manuellement). Les évolutions sont versionnées dans `supabase/migrations/` et sont à exécuter dans l'éditeur SQL Supabase :
> - `001_bundles_user_id.sql` : colonne `user_id` + index `user_id` et `lower(email)` (compte utilisateur, [../features/account.md](../features/account.md)).

## Table `bundles`

| Colonne | Type | Rôle |
|---|---|---|
| `uuid` | uuid | identifiant public (dans l'URL `/{uuid}/...`) |
| `email` | text | email de sauvegarde (nullable) |
| `user_id` | uuid → `auth.users(id)` | compte créateur (nullable, `on delete set null`) |
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

## Accès & sécurité

- Écriture/lecture uniquement via `/api/bundles/*` ([../api/internal-routes.md](../api/internal-routes.md)).
- **RLS activé sans policy** → clés anon/publiques verrouillées ; seule la clé service-role (serveur) lit/écrit. La clé anon ne sert qu'à **Supabase Auth** (session utilisateur).
- `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais porter le préfixe `NEXT_PUBLIC_`.

Cycle de persistance : voir [../architecture/state-and-persistence.md](../architecture/state-and-persistence.md).
