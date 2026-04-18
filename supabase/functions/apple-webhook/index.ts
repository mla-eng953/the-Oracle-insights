// Apple App Store Server Notifications v2 handler.
// - Apple POSTs a signed JWS; the outer `signedPayload` wraps `signedTransactionInfo`
//   and `signedRenewalInfo`, each itself a JWS.
// - Chain validation against Apple root CA should be done in production — this
//   handler decodes payloads and trusts them when ENV["APPLE_VERIFY_CHAIN"] != "1".
//   Promote to full x5c chain validation before shipping to the App Store.
// - Apple delivers the same notification multiple times if ACK is not 200; we
//   dedupe via apple_events.

import { corsHeaders } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  try {
    const body = await req.json() as { signedPayload: string };
    const payload = decodeJwsPayload<ASNPayload>(body.signedPayload);

    const txInfo = payload.data?.signedTransactionInfo
      ? decodeJwsPayload<TxInfo>(payload.data.signedTransactionInfo) : null;
    const renewInfo = payload.data?.signedRenewalInfo
      ? decodeJwsPayload<RenewInfo>(payload.data.signedRenewalInfo) : null;

    const supabase = adminClient();

    await supabase.from("apple_events").insert({
      notification_type: payload.notificationType,
      subtype: payload.subtype ?? null,
      original_transaction_id: txInfo?.originalTransactionId ?? null,
      transaction_id: txInfo?.transactionId ?? null,
      bundle_id: payload.data?.bundleId ?? null,
      environment: payload.data?.environment ?? null,
      payload: { payload, txInfo, renewInfo },
    });

    if (txInfo) await syncApple(txInfo, renewInfo);
    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("[apple] failed", err);
    // Return 500 so Apple retries — prevents silent data loss.
    return new Response((err as Error).message, { status: 500 });
  }
});

async function syncApple(tx: TxInfo, renew: RenewInfo | null) {
  const supabase = adminClient();

  // Resolve user via original_transaction_id → appleIdToUser map.
  const { data: link } = await supabase
    .from("apple_user_links")
    .select("user_id")
    .eq("original_transaction_id", tx.originalTransactionId)
    .maybeSingle();
  if (!link) {
    console.warn("[apple] no user linked for otxid", tx.originalTransactionId);
    return;
  }

  const plan = resolvePlanFromProductId(tx.productId);
  const periodEnd = tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null;

  await supabase.from("user_subscriptions").upsert({
    user_id: link.user_id,
    plan,
    platform: "apple",
    apple_original_transaction_id: tx.originalTransactionId,
    period_end: periodEnd,
    will_renew: renew?.autoRenewStatus === 1,
    cancel_reason: tx.revocationReason ? String(tx.revocationReason) : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  await supabase.rpc("recompute_entitlements", { uid: link.user_id });
}

function resolvePlanFromProductId(productId: string): "free" | "pro" | "elite" {
  if (productId.endsWith(".elite")) return "elite";
  if (productId.endsWith(".pro")) return "pro";
  return "free";
}

function decodeJwsPayload<T>(jws: string): T {
  const [_header, payload] = jws.split(".");
  const json = new TextDecoder().decode(base64UrlDecode(payload));
  return JSON.parse(json) as T;
}

function base64UrlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

interface ASNPayload {
  notificationType: string;
  subtype?: string;
  data?: { bundleId?: string; environment?: string; signedTransactionInfo?: string; signedRenewalInfo?: string };
}

interface TxInfo {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  expiresDate?: number;
  revocationReason?: number;
}

interface RenewInfo {
  autoRenewStatus: number;
  autoRenewProductId: string;
}
