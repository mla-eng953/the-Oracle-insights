// Send a push notification to users who have opted into the given category
// and have a registered token. Dispatches APNs for iOS and Web Push for
// browsers. Service-role-callable only.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logger.ts";
import { sendApns } from "../_shared/apns.ts";
import { sendWebPush } from "../_shared/webpush.ts";

const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") ?? "app.oracleinsights.OracleApp";
const APNS_PRODUCTION = (Deno.env.get("APNS_PRODUCTION") ?? "0") === "1";

interface Body {
  userIds?: string[];
  category: "line_movement" | "steam_move" | "pick_settled" | "daily_picks";
  title: string;
  body: string;
  data?: Record<string, unknown>;
  collapseId?: string;
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const log = createLogger("send-push");
  try {
    const body = await req.json() as Body;
    const supabase = adminClient();

    // Filter recipients by preference.
    let query = supabase.from("push_tokens").select("user_id, platform, apns_token, bundle_id, web_endpoint, web_p256dh, web_auth")
      .eq("enabled", true);
    if (body.userIds?.length) query = query.in("user_id", body.userIds);
    const { data: tokens, error } = await query;
    if (error) throw error;

    const userIds = [...new Set((tokens ?? []).map((t: { user_id: string }) => t.user_id))];
    const { data: prefs } = await supabase.from("push_prefs").select("*").in("user_id", userIds);
    const prefByUser = new Map<string, Record<string, boolean>>();
    for (const p of (prefs ?? []) as Record<string, boolean>[]) {
      prefByUser.set(p.user_id as unknown as string, p);
    }

    let sent = 0, failed = 0;
    for (const t of (tokens ?? []) as Array<{ user_id: string; platform: string; apns_token?: string; bundle_id?: string; web_endpoint?: string; web_p256dh?: string; web_auth?: string }>) {
      const pref = prefByUser.get(t.user_id);
      if (pref && pref[body.category] === false) continue;

      try {
        if (t.platform === "ios" && t.apns_token) {
          const result = await sendApns({
            deviceToken: t.apns_token,
            topic: t.bundle_id ?? APNS_BUNDLE_ID,
            production: APNS_PRODUCTION,
            collapseId: body.collapseId,
            payload: {
              aps: {
                alert: { title: body.title, body: body.body },
                sound: "default",
                "interruption-level": body.category === "steam_move" ? "time-sensitive" : "active",
              },
              ...body.data,
            },
          });
          if (!result.ok) {
            failed++;
            await markError(supabase, t.user_id, t.apns_token, result.reason);
            if (result.status === 410) {
              // Token unregistered — disable.
              await supabase.from("push_tokens").update({ enabled: false, last_error: "apns 410" })
                .eq("user_id", t.user_id).eq("apns_token", t.apns_token);
            }
          } else {
            sent++;
          }
        } else if (t.platform === "web" && t.web_endpoint) {
          const result = await sendWebPush({
            endpoint: t.web_endpoint,
            p256dh: t.web_p256dh!,
            auth: t.web_auth!,
            payload: { title: body.title, body: body.body, data: body.data ?? {} },
          });
          if (!result.ok) {
            failed++;
            await markError(supabase, t.user_id, t.web_endpoint, result.reason);
            if (result.status === 404 || result.status === 410) {
              await supabase.from("push_tokens").update({ enabled: false, last_error: `webpush ${result.status}` })
                .eq("user_id", t.user_id).eq("web_endpoint", t.web_endpoint);
            }
          } else {
            sent++;
          }
        }
      } catch (err) {
        failed++;
        log.error("dispatch_failed", { user_id: t.user_id, platform: t.platform, error: (err as Error).message });
      }
    }

    log.info("dispatched", { sent, failed, category: body.category });
    await log.flush();
    return jsonResponse({ ok: true, sent, failed });
  } catch (err) {
    log.error("failed", { error: (err as Error).message });
    await log.flush();
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});

async function markError(supabase: ReturnType<typeof adminClient>, userId: string, tokenKey: string, reason: string | undefined) {
  await supabase.from("push_tokens").update({ last_error: reason ?? "unknown", last_sent_at: new Date().toISOString() })
    .eq("user_id", userId)
    .or(`apns_token.eq.${tokenKey},web_endpoint.eq.${tokenKey}`);
}
