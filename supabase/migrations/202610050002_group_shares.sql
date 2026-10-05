alter table public.group_members
  add column if not exists share_cents integer check (share_cents is null or share_cents >= 0);
