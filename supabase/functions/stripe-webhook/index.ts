// Stripe webhook handler.
// - Verifies Stripe signature using the webhook secret.
// - Idempotent via stripe_events table.
// - Updates user_subscriptions + triggers recompute_entitlements.

import { corsHeaders } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });

  const body = await req.text();
  const valid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
  if (!valid) return new Response("invalid signature", { status: 400 });

  const event = JSON.parse(body) as StripeEvent;
  const supabase = adminClient();

  // Idempotency: claim the event row.
  const claim = await supabase.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    customer_id: (event.data.object as StripeObj).customer ?? null,
    subscription_id: (event.data.object as StripeObj).subscription ?? null,
    payload: event,
  }).select().single();
  if (claim.error && !claim.error.message.includes("duplicate")) {
    console.error("[stripe] claim failed", claim.error);
    return new Response("claim failed", { status: 500 });
  }
  if (claim.error?.message.includes("duplicate")) {
    return new Response("already processed", { status: 200, headers: corsHeaders });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.paid":
      case "invoice.payment_failed":
        await syncSubscription(event);
        break;
      default:
        // No-op for unhandled event types.
        break;
    }
    await supabase.from("stripe_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("[stripe] process failed", err);
    return new Response((err as Error).message, { status: 500 });
  }
});

async function syncSubscription(event: StripeEvent) {
  const supabase = adminClient();
  const obj = event.data.object as StripeObj;

  // Resolve user_id from the Stripe customer's metadata (set at checkout creation).
  const customerId = obj.customer;
  if (!customerId) return;
  const customer = await fetchStripe(`/customers/${customerId}`);
  const userId = customer.metadata?.supabase_user_id;
  if (!userId) {
    console.warn("[stripe] customer missing supabase_user_id", customerId);
    return;
  }

  // If we got a subscription object directly, use it; otherwise resolve from session.
  let sub = null;
  if (event.type.startsWith("customer.subscription")) {
    sub = obj;
  } else if (obj.subscription) {
    sub = await fetchStripe(`/subscriptions/${obj.subscription}`);
  }

  const plan = resolvePlan(sub);
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
  const willRenew = sub?.status === "active" && !sub?.cancel_at_period_end;

  await supabase.from("user_subscriptions").upsert({
    user_id: userId,
    plan,
    platform: "stripe",
    stripe_customer_id: customerId,
    stripe_subscription_id: sub?.id ?? null,
    period_end: periodEnd,
    will_renew: willRenew ?? false,
    cancel_reason: sub?.cancellation_details?.reason ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  await supabase.rpc("recompute_entitlements", { uid: userId });
}

function resolvePlan(sub: StripeObj | null): "free" | "pro" | "elite" {
  if (!sub || sub.status !== "active") return "free";
  const priceId = sub.items?.data?.[0]?.price?.id;
  const priceNickname = sub.items?.data?.[0]?.price?.nickname;
  if (priceId === Deno.env.get("STRIPE_PRICE_ELITE") || priceNickname === "elite") return "elite";
  return "pro";
}

async function fetchStripe(path: string): Promise<StripeObj> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  if (!res.ok) throw new Error(`Stripe ${path} ${res.status}`);
  return await res.json();
}

/**
 * Minimal Stripe signature verification. Use the v1 scheme.
 * https://stripe.com/docs/webhooks#verify-manually
 */
async function verifyStripeSignature(body: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(",").map(kv => kv.split("=").map(s => s.trim())));
  const t = parts.t; const v1 = parts.v1;
  if (!t || !v1) return false;
  const payload = `${t}.${body}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(hex, v1);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

interface StripeObj {
  id?: string;
  customer?: string;
  subscription?: string;
  status?: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  cancellation_details?: { reason?: string };
  metadata?: Record<string, string>;
  items?: { data?: Array<{ price?: { id?: string; nickname?: string } }> };
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: StripeObj };
}
