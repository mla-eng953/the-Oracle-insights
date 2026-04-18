-- Device-token registry for push notifications.
-- Unified table across iOS APNs and browser Web Push (VAPID). Platform column
-- disambiguates how the send-push edge fn handles the payload.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios','web')),

  -- iOS (APNs): 64-hex string.
  apns_token text,
  bundle_id text,

  -- Web Push (RFC 8030 + VAPID): endpoint + p256dh + auth.
  web_endpoint text,
  web_p256dh text,
  web_auth text,

  enabled boolean not null default true,
  last_registered timestamptz not null default now(),
  last_sent_at timestamptz,
  last_error text,
  unique (user_id, platform, apns_token),
  unique (user_id, platform, web_endpoint)
);
alter table public.push_tokens enable row level security;
create index if not exists push_tokens_user_idx on public.push_tokens (user_id) where enabled;

create policy "push_tokens_owner_all" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Per-user preferences for push categories.
create table if not exists public.push_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  line_movement boolean not null default true,
  steam_move boolean not null default true,
  pick_settled boolean not null default true,
  daily_picks boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.push_prefs enable row level security;
create policy "push_prefs_owner_all" on public.push_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
