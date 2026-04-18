// DSR (GDPR Article 20 / CCPA §1798.110) export.
// Returns every row across user-scoped tables that belongs to the caller,
// in a single JSON bundle ready for download.
//
// Rate-limited: one export per user per 24h via audit_logs.

import { preflight, jsonResponse, corsHeaders } from "../_shared/cors.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logger.ts";

const USER_TABLES = [
  "profiles",
  "user_roles",
  "user_subscriptions",
  "user_credits",
  "content_unlocks",
  "strategy_profiles",
  "tracked_picks",
  "age_verifications",
  "compliance_checks",
  "rg_state",
  "settlement_disputes",
  "apple_user_links",
  "entitlements",
  "device_fingerprints",
] as const;

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const log = createLogger("export-account-data");

  try {
    const { user } = await requireUser(req);
    const supabase = adminClient();

    // Rate limit: once per 24h.
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: recent } = await supabase
      .from("audit_logs")
      .select("id")
      .eq("actor_user_id", user.id)
      .eq("action", "data_export")
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) {
      return jsonResponse({ ok: false, error: "Already exported within the last 24h" }, 429);
    }

    const bundle: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email, created_at: user.created_at },
    };

    for (const table of USER_TABLES) {
      const column = table === "profiles" ? "id" : "user_id";
      const { data, error } = await supabase.from(table).select("*").eq(column, user.id);
      if (error) {
        log.warn("table_query_failed", { table, error: error.message });
        bundle[table] = { error: error.message };
        continue;
      }
      bundle[table] = data ?? [];
    }

    await supabase.from("audit_logs").insert({
      actor_user_id: user.id,
      action: "data_export",
      payload: { row_counts: Object.fromEntries(USER_TABLES.map(t => [t, Array.isArray(bundle[t]) ? (bundle[t] as unknown[]).length : 0])) },
    });

    log.info("exported", { user_id: user.id });
    await log.flush();

    return new Response(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="oracle-data-export-${user.id}.json"`,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("failed", { error: (err as Error).message });
    await log.flush();
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});
