# Groupes et invitations

Depuis le récapitulatif d’un bundle, un utilisateur peut créer un groupe puis inviter ses amis par lien ou par email. La session de chaque membre est conservée dans `localStorage` sous forme de jeton opaque ; les données du groupe ne sont pas accessibles avec le seul UUID du bundle.

- `POST /api/groups` crée le groupe et son organisateur.
- `POST /api/groups/:id/invitations` génère un lien ou envoie un email Brevo. Une seconde invitation vers le même email réutilise l’invitation en attente.
- `POST /api/groups/join` ajoute le membre. Une invitation email est à usage unique ; un lien générique peut accueillir plusieurs membres.
- `GET /api/groups/:id` exige le jeton membre dans `Authorization: Bearer …`.

Les tables nécessaires sont créées par `supabase/migrations/202610050001_groups.sql`. Elles ont la RLS activée sans policy et restent accessibles uniquement via le client service-role serveur.

## Répartition du prix

L’organisateur peut utiliser **Diviser équitablement** depuis le panneau du groupe. Le total est converti en centimes, divisé par le nombre de membres, puis les centimes restants sont distribués un par un dans l’ordre d’arrivée. La somme des parts est donc toujours strictement égale au total. Les parts sont persistées sur `group_members.share_cents` par la migration `202610050002_group_shares.sql` et visibles par tous les membres.
