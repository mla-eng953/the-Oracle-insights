-- Cloudflare Cron Triggers (cloudflare/src/scheduled.ts) replace pg_cron
-- as the primary scheduler — they're DST-aware and have hosted retries.
-- Keep pg_cron jobs available but unscheduled, so an operator can re-enable
-- them with a single SQL statement if Cloudflare is unavailable.

do $$
declare
  job record;
begin
  for job in select jobname from cron.job where jobname like 'oracle-%' loop
    perform cron.unschedule(job.jobname);
  end loop;
end $$;

comment on function private.invoke_edge_fn(text, jsonb) is
  'Backup invoker. Re-enable schedules via cron.schedule(...) if Cloudflare cron is offline.';
