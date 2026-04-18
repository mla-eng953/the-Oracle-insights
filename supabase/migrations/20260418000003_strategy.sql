-- Per-user strategy profiles — picks can be filtered/sized to user preference.

create table public.strategy_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Default',
  bankroll_usd numeric not null default 1000,
  unit_size_usd numeric not null default 10,
  kelly_fraction numeric not null default 0.25,
  max_per_pick_pct_bankroll numeric not null default 3,
  max_concurrent_exposure_pct numeric not null default 25,
  min_edge_pct numeric not null default 2,
  min_confidence integer not null default 60,
  allowed_sports text[] not null default array['NFL','NBA','MLB','NHL','NCAAF','NCAAB','MLS','EPL','UFC'],
  allowed_bet_types text[] not null default array['moneyline','spread','total','player_prop','nrfi'],
  allowed_tiers text[] not null default array['conservative','moderate','aggressive'],
  auto_track boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.strategy_profiles enable row level security;

-- Seed a default profile when a user is created.
create or replace function public.seed_strategy_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.strategy_profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_seed_strategy on auth.users;
create trigger on_auth_user_seed_strategy
  after insert on auth.users
  for each row execute function public.seed_strategy_profile();
