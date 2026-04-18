-- Oracle base schema: roles, subscriptions, credits, unlocks.
-- RLS first — user_roles isolated from profiles per security best practice.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- app_role enum + has_role() security-definer are the canonical pattern
-- to avoid recursive RLS on role checks.
create type public.app_role as enum ('admin', 'pro', 'free');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(uid uuid, required public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = uid and ur.role = required);
$$;

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(uid, 'admin');
$$;

create table public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free','pro')) default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  apple_original_transaction_id text,
  renews_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.user_subscriptions enable row level security;

create table public.content_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.content_unlocks enable row level security;
create index on public.content_unlocks (user_id, feature_key);

create table public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 100,
  updated_at timestamptz not null default now()
);
alter table public.user_credits enable row level security;

create or replace function public.get_user_credits(uid uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select balance from public.user_credits where user_id = uid), 0);
$$;

-- Seed credit balance on user creation (100 free credits).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.user_credits (user_id, balance) values (new.id, 100);
  insert into public.user_subscriptions (user_id, plan) values (new.id, 'free');
  insert into public.user_roles (user_id, role) values (new.id, 'free');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Audit log
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
