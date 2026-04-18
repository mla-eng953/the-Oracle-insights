-- Compliance & responsible-gambling state.

create table public.compliance_checks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country text not null,
  region text,
  jurisdiction text not null,
  status text not null check (status in ('allowed','restricted','unknown','underage')),
  restriction_reason text,
  ip_prefix text,
  checked_at timestamptz not null default now()
);
alter table public.compliance_checks enable row level security;

create table public.age_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dob date not null,
  method text not null default 'self-attested' check (method in ('self-attested','id-verified','third-party')),
  verified_at timestamptz not null default now()
);
alter table public.age_verifications enable row level security;

create table public.rg_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  self_excluded_until timestamptz,
  daily_session_limit_minutes integer,
  loss_limit_usd numeric,
  loss_limit_period_days integer,
  last_nudge_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.rg_state enable row level security;

-- Settlement disputes: users flag grading errors.
create table public.settlement_disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pick_id uuid not null references public.picks(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','rejected')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.settlement_disputes enable row level security;
