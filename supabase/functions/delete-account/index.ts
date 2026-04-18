// Self-serve account deletion. Required by Apple 5.1.1(v) and by
// CCPA/GDPR. Two-phase: user-initiated with typed confirmation, then
// server cascades. auth.users delete triggers all `on delete cascade`
// foreign keys — we still scrub a few tables explicitly for defense in depth.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const { user } = await requireUser(req);
    const { confirmation } = await req.json() as { confirmation: string };
    if (confirmation !== "DELETE") {
      return jsonResponse({ ok: false, error: "Type DELETE to confirm" }, 400);
    }

    const supabase = adminClient();

    // Audit-log the deletion before wiping references so we retain an
    // administrative record (but no PII) for fraud-dispute periods.
    await supabase.from("audit_logs").insert({
      actor_user_id: user.id,
      action: "account_deleted",
      payload: { initiated_by: "user", email_hash: await sha256(user.email ?? "") },
    });

    // Scrub personal data tables before auth delete so any delay in cascade
    // cannot leave PII behind.
    const tables = [
      "age_verifications", "rg_state", "compliance_checks",
      "strategy_profiles", "tracked_picks", "user_credits",
      "user_subscriptions", "user_roles", "content_unlocks",
      "apple_user_links", "entitlements", "settlement_disputes",
    ];
    for (const t of tables) {
      await supabase.from(t).delete().eq("user_id", user.id);
    }
    // profiles references id = user_id:
    await supabase.from("profiles").delete().eq("id", user.id);

    // Finally, delete the auth user. This cascades to any remaining FKs.
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) return jsonResponse({ ok: false, error: error.message }, 500);

    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[delete-account]", err);
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});

async function sha256(s: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}
