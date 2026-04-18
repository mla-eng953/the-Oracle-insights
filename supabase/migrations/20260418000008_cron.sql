-- Schedule core pipeline edge functions via pg_cron + pg_net.
-- Times are UTC because pg_cron runs in UTC; ET equivalents in comments.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create schema if not exists private;

-- Settings table for the project URL + service-role key. These should be set
-- via:  alter database postgres set app.settings.supabase_url = '...';
-- Do NOT commit the actual values.
create or replace function private.cron_settings()
returns table(supabase_url text, service_role_key text)
language sql security definer set search_path = '' as $$
  select
    current_setting('app.settings.supabase_url', true)::text,
    current_setting('app.settings.service_role_key', true)::text;
$$;

-- Helper: invoke a Supabase edge function via pg_net.
create or replace function private.invoke_edge_fn(name text, body jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  cfg record;
  request_id bigint;
begin
  select * into cfg from private.cron_settings();
  select net.http_post(
    url := cfg.supabase_url || '/functions/v1/' || name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cfg.service_role_key,
      'x-oracle-cron', '1'
    ),
    body := body,
    timeout_milliseconds := 50000
  ) into request_id;
  return request_id;
end; $$;

-- Generate picks: 11am ET (15 UTC) and 7pm ET (23 UTC).
-- DST not handled here; use Cloudflare Cron Triggers if you need DST-aware times.
select cron.schedule(
  'oracle-generate-picks-am',
  '0 15 * * *',
  $$ select private.invoke_edge_fn('generate-picks'); $$
);
select cron.schedule(
  'oracle-generate-picks-pm',
  '0 23 * * *',
  $$ select private.invoke_edge_fn('generate-picks'); $$
);

-- Capture closing odds: every minute. The function itself filters to picks
-- whose match starts within the next 20 minutes, so this is cheap.
select cron.schedule(
  'oracle-capture-closing-odds',
  '* * * * *',
  $$ select private.invoke_edge_fn('capture-closing-odds'); $$
);

-- Settle picks: every 5 minutes. Fast enough that no game stays unsettled
-- for long; cheap because the function is idempotent and short-circuits.
select cron.schedule(
  'oracle-settle-picks',
  '*/5 * * * *',
  $$ select private.invoke_edge_fn('settle-picks'); $$
);

-- Ops view: most recent oracle-* invocations with their HTTP status.
create or replace view private.cron_recent as
  select
    j.jobname,
    r.status,
    r.start_time,
    r.end_time,
    r.return_message
  from cron.job j
  left join cron.job_run_details r on r.jobid = j.jobid
  where j.jobname like 'oracle-%'
  order by r.start_time desc nulls last
  limit 100;
