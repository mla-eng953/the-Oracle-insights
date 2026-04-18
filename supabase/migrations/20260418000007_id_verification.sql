-- ID verification via Persona. Upgrades self-attested age to identity-verified.

alter table public.age_verifications
  add column if not exists persona_inquiry_id text,
  add column if not exists persona_reference_id text,
  add column if not exists persona_account_id text,
  add column if not exists status text not null default 'self-attested'
    check (status in ('self-attested','pending','approved','declined','expired'));

create table if not exists public.persona_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique,
  event_name text not null,
  inquiry_id text,
  user_id uuid,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.persona_events enable row level security;
create index if not exists persona_events_inquiry_idx on public.persona_events (inquiry_id);
