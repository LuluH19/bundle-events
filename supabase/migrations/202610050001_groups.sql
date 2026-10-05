create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  bundle_uuid uuid not null unique references public.bundles(uuid) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  email text,
  role text not null default 'member' check (role in ('organizer', 'member')),
  access_token uuid not null unique default gen_random_uuid(),
  joined_at timestamptz not null default now()
);
create unique index if not exists group_members_group_email_unique
  on public.group_members (group_id, lower(email)) where email is not null;

create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  email text,
  token uuid not null unique default gen_random_uuid(),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists group_invitations_pending_email_unique
  on public.group_invitations (group_id, lower(email))
  where email is not null and accepted_at is null;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invitations enable row level security;
