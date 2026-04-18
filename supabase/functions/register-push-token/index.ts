// Client calls this after receiving an APNs device token (iOS shell) or
// a Web Push subscription (browser). Upserts into push_tokens.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const { user } = await requireUser(req);
    const body = await req.json() as RegisterBody;
    const supabase = adminClient();

    if (body.platform === "ios") {
      if (!body.apnsToken) return jsonResponse({ ok: false, error: "missing apnsToken" }, 400);
      const { error } = await supabase.from("push_tokens").upsert({
        user_id: user.id, platform: "ios",
        apns_token: body.apnsToken, bundle_id: body.bundleId ?? null,
        enabled: true, last_registered: new Date().toISOString(),
      }, { onConflict: "user_id,platform,apns_token" });
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true });
    }

    if (body.platform === "web") {
      if (!body.endpoint || !body.keys) return jsonResponse({ ok: false, error: "missing endpoint or keys" }, 400);
      const { error } = await supabase.from("push_tokens").upsert({
        user_id: user.id, platform: "web",
        web_endpoint: body.endpoint,
        web_p256dh: body.keys.p256dh,
        web_auth: body.keys.auth,
        enabled: true, last_registered: new Date().toISOString(),
      }, { onConflict: "user_id,platform,web_endpoint" });
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: "unknown platform" }, 400);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});

interface RegisterBody {
  platform: "ios" | "web";
  apnsToken?: string;
  bundleId?: string;
  endpoint?: string;
  keys?: { p256dh: string; auth: string };
}
