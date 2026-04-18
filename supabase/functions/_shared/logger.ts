// Structured logger for edge functions. Writes to:
//   - BetterStack (Logtail) when BETTERSTACK_SOURCE_TOKEN is set.
//   - Otherwise stdout (Supabase log drain).
//
// Use:
//   const log = createLogger("generate-picks");
//   log.info("started", { sport: "NBA" });
//   log.error("oddsApi failed", { status: 502 });
//
// Batches synchronously per request — Workers/Deno edge functions are
// short-lived so we don't bother with a background flush loop.

const BETTERSTACK_TOKEN = Deno.env.get("BETTERSTACK_SOURCE_TOKEN");
const BETTERSTACK_HOST = Deno.env.get("BETTERSTACK_HOST") ?? "https://in.logs.betterstack.com";
const APP_ENV = Deno.env.get("APP_ENV") ?? "development";

type Level = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: Level;
  message: string;
  service: string;
  env: string;
  timestamp: string;
  [k: string]: unknown;
}

interface Logger {
  debug: (msg: string, attrs?: Record<string, unknown>) => void;
  info: (msg: string, attrs?: Record<string, unknown>) => void;
  warn: (msg: string, attrs?: Record<string, unknown>) => void;
  error: (msg: string, attrs?: Record<string, unknown>) => void;
  flush: () => Promise<void>;
}

export function createLogger(service: string): Logger {
  const buffer: LogEntry[] = [];

  const enqueue = (level: Level, message: string, attrs?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level, message, service, env: APP_ENV,
      timestamp: new Date().toISOString(),
      ...(attrs ?? {}),
    };
    buffer.push(entry);
    // Always also write to console for Supabase native logs.
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(JSON.stringify(entry));
  };

  return {
    debug: (m, a) => enqueue("debug", m, a),
    info: (m, a) => enqueue("info", m, a),
    warn: (m, a) => enqueue("warn", m, a),
    error: (m, a) => enqueue("error", m, a),
    flush: async () => {
      if (!BETTERSTACK_TOKEN || buffer.length === 0) { buffer.length = 0; return; }
      const batch = buffer.splice(0);
      try {
        await fetch(BETTERSTACK_HOST, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${BETTERSTACK_TOKEN}`,
          },
          body: JSON.stringify(batch),
        });
      } catch (err) {
        console.error("[logger] BetterStack flush failed", err);
      }
    },
  };
}

/**
 * Wrap a Deno.serve handler so structured logs flush at the end of every
 * request, including on error. Avoids losing the last batch when the
 * isolate is recycled.
 */
export function withLogger(service: string, handler: (req: Request, log: Logger) => Promise<Response>) {
  return async (req: Request) => {
    const log = createLogger(service);
    const start = Date.now();
    try {
      const res = await handler(req, log);
      log.info("request", { method: req.method, status: res.status, ms: Date.now() - start });
      await log.flush();
      return res;
    } catch (err) {
      log.error("unhandled", { error: (err as Error).message, stack: (err as Error).stack });
      await log.flush();
      throw err;
    }
  };
}
