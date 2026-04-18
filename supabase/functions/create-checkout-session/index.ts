// Create a Stripe Checkout session for the authenticated user.
// Stamps the customer with `metadata.supabase_user_id` so the webhook
// can resolve user_id without out-of-band lookup.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

const PRICE_BY_PLAN: Record<"pro" | "elite", string | undefined> = {
  pro: Deno.env.get("STRIPE_PRICE_PRO"),
  elite: Deno.env.get("STRIPE_PRICE_ELITE"),
};

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const { user } = await requireUser(req);
    const { plan } = await req.json() as { plan: "pro" | "elite" };
    const price = PRICE_BY_PLAN[plan];
    if (!price) return jsonResponse({ ok: false, error: "Plan not configured" }, 400);

    const supabase = adminClient();
    const { data: existing } = await supabase
      .from("user_subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();

    let customerId = existing?.stripe_customer_id ?? null;
    if (!customerId) {
      const created = await stripeForm("/customers", {
        email: user.email ?? "",
        "metadata[supabase_user_id]": user.id,
      });
      customerId = created.id;
      await supabase.from("user_subscriptions").upsert({
        user_id: user.id, stripe_customer_id: customerId,
        plan: "free", platform: "stripe", updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }

    const session = await stripeForm("/checkout/sessions", {
      mode: "subscription",
      customer: customerId!,
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      success_url: `${SITE_URL}/billing?status=success`,
      cancel_url: `${SITE_URL}/billing?status=cancel`,
      "metadata[supabase_user_id]": user.id,
      allow_promotion_codes: "true",
    });

    return jsonResponse({ ok: true, url: session.url });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[create-checkout-session]", err);
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});

async function stripeForm(path: string, params: Record<string, string>): Promise<{ id: string; url?: string }> {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Stripe ${path} ${res.status}: ${await res.text()}`);
  return await res.json();
}
