// Cloudflare Worker that drives the Oracle pipeline schedule.
// Runs once per minute; computes America/New_York wall-clock and dispatches
// the right edge function, with retries and (optional) alerting.
//
// Why not pg_cron only:
//   - pg_cron runs UTC and has no concept of DST; "11am ET" drifts an hour
//     twice a year.
//   - Workers Cron Triggers give us hosted retries, observability,
//     and isolation from the database.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALERT_WEBHOOK_URL?: string;
}

interface Job {
  name: string;
  fn: string;
  shouldRun: (ny: NYTime) => boolean;
  body?: Record<string, unknown>;
}

const JOBS: Job[] = [
  // Generate picks twice a day in ET, DST-aware.
  { name: "generate-picks-am", fn: "generate-picks", shouldRun: (t) => t.hour === 11 && t.minute === 0 },
  { name: "generate-picks-pm", fn: "generate-picks", shouldRun: (t) => t.hour === 19 && t.minute === 0 },

  // Capture closing odds every minute. The function self-filters.
  { name: "capture-closing-odds", fn: "capture-closing-odds", shouldRun: () => true },

  // Settle picks every 5 minutes.
  { name: "settle-picks", fn: "settle-picks", shouldRun: (t) => t.minute % 5 === 0 },

  // Model-drift check: Mondays at 06:00 ET.
  { name: "model-drift", fn: "check-model-drift", shouldRun: (t) => t.weekday === "Mon" && t.hour === 6 && t.minute === 0 },
];

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const now = nyNow();
    for (const job of JOBS) {
      if (!job.shouldRun(now)) continue;
      ctx.waitUntil(invoke(env, job).catch((err) => alert(env, `[${job.name}] ${err}`)));
    }
  },
};

async function invoke(env: Env, job: Job): Promise<void> {
  const url = `${env.SUPABASE_URL}/functions/v1/${job.fn}`;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "x-oracle-cron": "1",
          "x-oracle-cron-job": job.name,
        },
        body: JSON.stringify(job.body ?? {}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await sleep(2 ** attempt * 1000);
    }
  }
  throw lastErr;
}

async function alert(env: Env, message: string) {
  console.error(message);
  if (!env.ALERT_WEBHOOK_URL) return;
  try {
    await fetch(env.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `oracle-cron: ${message}` }),
    });
  } catch {
    // best-effort
  }
}

interface NYTime { hour: number; minute: number; weekday: string }

function nyNow(): NYTime {
  // Intl.DateTimeFormat handles DST automatically.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: parts.weekday,
  };
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
