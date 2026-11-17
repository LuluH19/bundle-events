# Compte utilisateur & historique des bundles

[← Sommaire](../README.md)

Compte **facultatif** : on peut toujours créer et partager un bundle sans se connecter. Une fois connecté, l'accueil liste les bundles de l'utilisateur.

## Connexion (Supabase Auth, lien magique)

1. Header → **« Se connecter »** (`components/layout/AccountMenu.tsx`) ouvre `LoginModal`.
2. `services/account.ts` → `signInWithEmail(email)` → `supabase.auth.signInWithOtp` (client navigateur `lib/supabase/browser.ts`, clé anon), `emailRedirectTo = {origin}/auth/callback`.
3. L'utilisateur clique le lien reçu → `app/auth/callback/route.ts` échange le code contre une session (cookies `sb-*`) → redirection `/#mes-bundles`.
4. `src/proxy.ts` rafraîchit la session à chaque requête (si cookie `sb-*` présent).
5. Une fois connecté, le header affiche un **avatar (initiale) + l'email** (avatar seul sur mobile). Au clic : « Connecté en tant que … », lien « Mes bundles », « Se déconnecter » (`POST /auth/signout`).

Côté serveur, `lib/supabase/session.ts` → `getCurrentUser()` renvoie `{ id, email } | null` (via `auth.getUser()`). Côté client, `hooks/useCurrentUser.ts` (`undefined` = chargement, `null` = déconnecté).

## Rattachement des bundles

Un bundle appartient au compte si :
- il a été **créé en étant connecté** : `POST /api/bundles` renseigne `user_id` ;
- **ou** il a été sauvegardé avec **le même email** que le compte (colonne `email`, via la modale de partage).

`GET /api/me/bundles` applique ce filtre (`user_id.eq.{id}` OR `email.eq.{email}`), tri `updated_at` desc.

> L'email de la modale de partage n'est pas vérifié : un tiers peut faire apparaître un bundle dans le compte d'une autre adresse. Aucune donnée de la victime n'est exposée.

## Liste « Mes bundles »

`components/MyBundles.tsx` (hook `useMyBundles`), rendue dans `HomeView` juste après le hero, uniquement si connecté (ancre `#mes-bundles`). Chaque carte (événement, départ, dates, hôtel) est un lien vers la fiche `/{uuid}/reserver` (aller, retour, hôtel). État vide et état d'erreur gérés.

## Mise en place

- Exécuter `supabase/migrations/001_bundles_user_id.sql`.
- Renseigner `NEXT_PUBLIC_SUPABASE_ANON_KEY` et configurer les Redirect URLs : voir [../getting-started/environment.md](../getting-started/environment.md).
