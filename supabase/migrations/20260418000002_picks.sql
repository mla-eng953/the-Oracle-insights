-- Picks, matches, settlements, closing odds, analyses.

create table public.matches (
  id text primary key,
  sport text not null,
  league text,
  home_team text not null,
  away_team text not null,
  home_team_espn_id text,
  away_team_espn_id text,
  starts_at timestamptz not null,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled','live','final','postponed')),
  final_home_score integer,
  final_away_score integer,
  updated_at timestamptz not null default now()
);
alter table public.matches enable row level security;
create index on public.matches (starts_at);
create index on public.matches (sport, status);

create table public.picks (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches(id) on delete cascade,
  sport text not null,
  bet_type text not null,
  side text not null,
  line numeric,
  selection_label text not null,
  american_odds integer not null,
  decimal_odds numeric not null,
  implied_prob numeric not null,
  true_prob numeric not null,
  true_prob_low numeric not null,
  true_prob_high numeric not null,
  edge_pct numeric not null,
  confidence integer not null,
  tier text not null check (tier in ('conservative','moderate','aggressive')),
  signals jsonb not null default '[]',
  rationale jsonb not null default '{}',
  suggested_unit_stake numeric not null,
  suggested_fractional_kelly numeric not null,
  model_version text not null,
  player_id text,
  player_name text,
  player_team text,
  is_potd boolean not null default false,
  status_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.picks enable row level security;
create index on public.picks (created_at desc);
create index on public.picks (sport, tier) where status_active;
create index on public.picks (match_id);

create table public.closing_odds (
  pick_id uuid primary key references public.picks(id) on delete cascade,
  american_odds integer not null,
  decimal_odds numeric not null,
  implied_prob numeric not null,
  captured_at timestamptz not null default now()
);
alter table public.closing_odds enable row level security;

create table public.pick_settlements (
  pick_id uuid primary key references public.picks(id) on delete cascade,
  result text not null check (result in ('win','loss','push','void')),
  final_home_score integer,
  final_away_score integer,
  clv numeric,
  settled_at timestamptz not null default now()
);
alter table public.pick_settlements enable row level security;
create index on public.pick_settlements (settled_at desc);

-- Convenience view for CLV dashboards.
create or replace view public.closing_odds_join as
  select
    p.id as pick_id,
    p.sport,
    p.bet_type,
    p.tier,
    p.american_odds as entry_american,
    co.american_odds as closing_american,
    co.implied_prob - p.implied_prob as clv,
    s.result,
    s.settled_at
  from public.picks p
  left join public.closing_odds co on co.pick_id = p.id
  left join public.pick_settlements s on s.pick_id = p.id;

create table public.pick_analyses (
  pick_id uuid primary key references public.picks(id) on delete cascade,
  thesis text not null,
  risk text not null,
  generated_at timestamptz not null default now()
);
alter table public.pick_analyses enable row level security;

create table public.postgame_analyses (
  pick_id uuid primary key references public.picks(id) on delete cascade,
  writeup text not null,
  created_at timestamptz not null default now()
);
alter table public.postgame_analyses enable row level security;

create table public.tracked_picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pick_id uuid not null references public.picks(id) on delete cascade,
  user_stake_usd numeric,
  user_entry_american integer,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, pick_id)
);
alter table public.tracked_picks enable row level security;
create index on public.tracked_picks (user_id) where archived_at is null;
