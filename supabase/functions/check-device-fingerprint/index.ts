// Validate the visitorId returned by FingerprintJS Pro server-side, then
// upsert the (visitor_id, user_id) link and enforce a rolling cap of N
// distinct accounts per fingerprint.
//
// Why server-side validation? The browser SDK returns a `requestId`; we POST
// it to FingerprintJS's Server API to confirm it isn't spoofed by a
// determined attacker. The visitor ID alone is forgeable.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logger.ts";

const FP_API_KEY = Deno.env.get("FINGERPRINT_API_KEY");
const FP_REGION = Deno.env.get("FINGERPRINT_REGION") ?? "us";
const MAX_ACCOUNTS_PER_FINGERPRINT = Number(Deno.env.get("MAX_ACCOUNTS_PER_FINGERPRINT") ?? "3");
const WINDOW_DAYS = Number(Deno.env.get("FINGERPRINT_WINDOW_DAYS") ?? "30");

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const log = createLogger("check-device-fingerprint");

  try {
    const { user } = await requireUser(req);
    const { requestId, visitorId: clientVisitorId } = await req.json() as {
      requestId: string; visitorId: string;
    };
    if (!requestId || !clientVisitorId) {
      return jsonResponse({ ok: false, error: "missing requestId or visitorId" }, 400);
    }

    let visitorId = clientVisitorId;
    let ipCountry: string | undefined;

    if (FP_API_KEY) {
      const verified = await verifyWithFingerprint(requestId);
      if (!verified) {
        log.warn("fingerprint_unverified", { user_id: user.id });
        return jsonResponse({ ok: false, error: "fingerprint verification failed" }, 400);
      }
      if (verified.visitorId !== clientVisitorId) {
        log.warn("fingerprint_mismatch", { client: clientVisitorId, server: verified.visitorId });
        return jsonResponse({ ok: false, error: "fingerprint tampering detected" }, 400);
      }
      visitorId = verified.visitorId;
      ipCountry = verified.ipCountry;
    }

    const supabase = adminClient();

    // Upsert the link.
    await supabase.rpc("upsert_device_fingerprint", {
      p_visitor_id: visitorId,
      p_user_id: user.id,
      p_ip_country: ipCountry ?? null,
      p_user_agent: req.headers.get("user-agent") ?? null,
    }).then(async (res) => {
      if (res.error) {
        // Fallback if the RPC isn't installed yet — direct upsert.
        await supabase.from("device_fingerprints").upsert({
          visitor_id: visitorId,
          user_id: user.id,
          last_seen: new Date().toISOString(),
          ip_country: ipCountry,
          user_agent: req.headers.get("user-agent"),
        }, { onConflict: "visitor_id,user_id" });
      }
    });

    // Enforce account cap per fingerprint.
    const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();
    const { data: count } = await supabase.rpc("fingerprint_account_count", {
      vid: visitorId,
      since,
    });
    const exceeded = (count ?? 0) > MAX_ACCOUNTS_PER_FINGERPRINT;

    if (exceeded) {
      log.warn("account_cap_exceeded", {
        visitor_id: visitorId, count, cap: MAX_ACCOUNTS_PER_FINGERPRINT,
      });
    }

    await log.flush();
    return jsonResponse({
      ok: !exceeded,
      visitorId,
      accountCount: count,
      cap: MAX_ACCOUNTS_PER_FINGERPRINT,
      exceeded,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("failed", { error: (err as Error).message });
    await log.flush();
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});

interface FpVerified { visitorId: string; ipCountry?: string }

async function verifyWithFingerprint(requestId: string): Promise<FpVerified | null> {
  const host = FP_REGION === "eu" ? "eu.api.fpjs.io" : FP_REGION === "ap" ? "ap.api.fpjs.io" : "api.fpjs.io";
  const res = await fetch(`https://${host}/events/${requestId}`, {
    headers: { "Auth-API-Key": FP_API_KEY!, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = await res.json() as {
    products?: { identification?: { data?: { visitorId?: string; ip?: string; ipLocation?: { country?: { code?: string } } } } };
  };
  const ident = json.products?.identification?.data;
  if (!ident?.visitorId) return null;
  return { visitorId: ident.visitorId, ipCountry: ident.ipLocation?.country?.code };
}
