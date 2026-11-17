-- Rattache un bundle au compte qui l'a créé (compte facultatif : user_id reste nullable).
alter table public.bundles
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists bundles_user_id_idx on public.bundles (user_id);
create index if not exists bundles_email_lower_idx on public.bundles (lower(email));
