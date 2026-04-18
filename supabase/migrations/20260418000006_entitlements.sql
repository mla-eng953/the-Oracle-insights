-- Entitlements: unified view across Stripe (web) and Apple IAP (iOS).
-- Principle: `user_subscriptions` is the canonical row per user; platform-specific
-- tables capture raw receipt data for audit and refund/chargeback handling.

alter table public.user_subscriptions
  add column if not exists platform text not null default 'none'
    check (platform in ('none','stripe','apple','admin')),
  add column if not exists period_end timestamptz,
  add column if not exists will_renew boolean not null default false,
  add column if not exists cancel_reason text,
  add column if not exists latest_receipt_hash text;

-- Stripe event log — idempotency + audit trail.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  customer_id text,
  subscription_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.stripe_events enable row level security;

-- Apple ASN v2 event log.
create table if not exists public.apple_events (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null,
  subtype text,
  original_transaction_id text,
  transaction_id text,
  bundle_id text,
  environment text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.apple_events enable row level security;
create index if not exists apple_events_otxid_idx on public.apple_events (original_transaction_id);

-- Map Apple's original_transaction_id to a Supabase user. iOS client posts
-- this link via the link-apple-receipt edge function after first purchase.
create table if not exists public.apple_user_links (
  original_transaction_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bundle_id text,
  linked_at timestamptz not null default now()
);
alter table public.apple_user_links enable row level security;
create policy "apple_link_owner_select" on public.apple_user_links
  for select using (auth.uid() = user_id);

-- Feature entitlements — which features a user has access to right now.
-- Derived from subscription state; computed by compute_entitlements().
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null check (tier in ('free','pro','elite')) default 'free',
  features text[] not null default array[]::text[],
  expires_at timestamptz,
  source text not null default 'default' check (source in ('default','stripe','apple','admin')),
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy "entitlements_owner_select" on public.entitlements
  for select using (auth.uid() = user_id);

-- Canonical entitlement set per tier.
create or replace function public.tier_features(t text)
returns text[] language sql immutable as $$
  select case t
    when 'free' then array['view_picks','track_pick_limited','basic_analytics']
    when 'pro' then array['view_picks','track_pick_unlimited','full_analytics','clv_dashboard','strategy_profiles','alerts']
    when 'elite' then array['view_picks','track_pick_unlimited','full_analytics','clv_dashboard','strategy_profiles','alerts','early_picks','api_access','priority_support']
    else array[]::text[]
  end;
$$;

-- Resolve entitlements from user_subscriptions. Call on every webhook ACK.
create or replace function public.recompute_entitlements(uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  s record;
  final_tier text;
  final_source text;
  final_expires timestamptz;
begin
  select * into s from public.user_subscriptions where user_id = uid;
  if s is null then
    final_tier := 'free'; final_source := 'default'; final_expires := null;
  elsif s.period_end is not null and s.period_end > now() then
    final_tier := coalesce(s.plan, 'free');
    final_source := s.platform;
    final_expires := s.period_end;
  else
    final_tier := 'free'; final_source := 'default'; final_expires := null;
  end if;

  insert into public.entitlements (user_id, tier, features, expires_at, source, updated_at)
  values (uid, final_tier, public.tier_features(final_tier), final_expires, final_source, now())
  on conflict (user_id) do update
    set tier = excluded.tier,
        features = excluded.features,
        expires_at = excluded.expires_at,
        source = excluded.source,
        updated_at = now();
end; $$;

-- Seed entitlement on signup.
create or replace function public.handle_new_user_entitlement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_entitlements(new.id);
  return new;
end; $$;

drop trigger if exists on_auth_user_entitlement on auth.users;
create trigger on_auth_user_entitlement
  after insert on auth.users
  for each row execute function public.handle_new_user_entitlement();
