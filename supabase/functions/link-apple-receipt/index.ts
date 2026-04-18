// Called by the iOS client right after a successful StoreKit purchase.
// Maps Apple's originalTransactionId to the Supabase user, so apple-webhook
// can resolve user_id when ASN v2 events arrive.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const { user } = await requireUser(req);
    const { originalTransactionId, bundleId } = await req.json() as {
      originalTransactionId: string; bundleId?: string;
    };
    if (!originalTransactionId) return jsonResponse({ ok: false, error: "missing otxid" }, 400);

    const supabase = adminClient();
    const { error } = await supabase.from("apple_user_links").upsert({
      original_transaction_id: originalTransactionId,
      user_id: user.id,
      bundle_id: bundleId ?? null,
    }, { onConflict: "original_transaction_id" });
    if (error) return jsonResponse({ ok: false, error: error.message }, 500);

    return jsonResponse({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});
