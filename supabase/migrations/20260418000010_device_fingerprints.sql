-- Device fingerprint registry. Used to:
-- 1) Cap accounts per device within a rolling window (anti-fraud).
-- 2) Surface mismatches when a known account suddenly switches devices
--    (used for risk scoring, not blocking).

create table if not exists public.device_fingerprints (
  visitor_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  request_count integer not null default 1,
  ip_country text,
  user_agent text,
  primary key (visitor_id, user_id)
);
alter table public.device_fingerprints enable row level security;
create index if not exists df_visitor_idx on public.device_fingerprints (visitor_id);
create index if not exists df_user_idx on public.device_fingerprints (user_id);

create policy "df_owner_select" on public.device_fingerprints
  for select using (auth.uid() = user_id);

-- How many distinct accounts has this fingerprint been associated with?
-- Service-role-only — exposed via RPC for the edge fn.
create or replace function public.fingerprint_account_count(vid text, since timestamptz)
returns integer language sql security definer set search_path = public as $$
  select count(distinct user_id)::integer
    from public.device_fingerprints
    where visitor_id = vid and last_seen > since;
$$;
