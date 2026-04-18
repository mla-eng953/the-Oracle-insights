// Track a pick for the authenticated user. Enforces:
// - Pro plan OR sufficient credits (free tier).
// - Age verification + non-restricted jurisdiction.
// - Self-exclusion / cool-off window check.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const { user } = await requireUser(req);
    const { pickId, stakeUsd, entryAmerican } = await req.json() as {
      pickId: string; stakeUsd?: number; entryAmerican?: number;
    };
    const supabase = adminClient();

    const [{ data: age }, { data: compliance }, { data: rg }, { data: sub }, { data: credits }] = await Promise.all([
      supabase.from("age_verifications").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("compliance_checks").select("status").eq("user_id", user.id).maybeSingle(),
      supabase.from("rg_state").select("self_excluded_until").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_subscriptions").select("plan").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_credits").select("balance").eq("user_id", user.id).maybeSingle(),
    ]);

    if (!age) return jsonResponse({ ok: false, error: "Age verification required" }, 403);
    if (compliance?.status === "restricted") return jsonResponse({ ok: false, error: "Jurisdiction restricted" }, 403);
    if (rg?.self_excluded_until && new Date(rg.self_excluded_until) > new Date()) {
      return jsonResponse({ ok: false, error: "Self-exclusion active" }, 403);
    }

    const isPro = sub?.plan === "pro";
    if (!isPro) {
      if (!credits || credits.balance <= 0) return jsonResponse({ ok: false, error: "No credits remaining" }, 402);
      await supabase.from("user_credits").update({ balance: credits.balance - 1, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    }

    const { error } = await supabase.from("tracked_picks").upsert({
      user_id: user.id,
      pick_id: pickId,
      user_stake_usd: stakeUsd ?? null,
      user_entry_american: entryAmerican ?? null,
      archived_at: null,
    }, { onConflict: "user_id,pick_id" });
    if (error) return jsonResponse({ ok: false, error: error.message }, 500);

    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[track-pick]", err);
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});
