// Persona webhook handler. Verifies HMAC-SHA256 signature and upserts
// age_verifications based on inquiry.approved / inquiry.declined events.
// Docs: https://docs.withpersona.com/webhooks

import { corsHeaders } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const PERSONA_WEBHOOK_SECRET = Deno.env.get("PERSONA_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const signatureHeader = req.headers.get("persona-signature");
  const body = await req.text();
  const valid = await verifyPersonaSignature(body, signatureHeader, PERSONA_WEBHOOK_SECRET);
  if (!valid) return new Response("invalid signature", { status: 400 });

  const event = JSON.parse(body) as PersonaEvent;
  const supabase = adminClient();

  // Idempotency: unique constraint on event_id.
  const claim = await supabase.from("persona_events").insert({
    event_id: event.data.id,
    event_name: event.data.attributes.name,
    inquiry_id: event.data.attributes.payload?.data?.id ?? null,
    user_id: event.data.attributes.payload?.data?.attributes?.["reference-id"] ?? null,
    payload: event,
  });
  if (claim.error && !claim.error.message.includes("duplicate")) {
    console.error("[persona] claim", claim.error);
    return new Response("claim failed", { status: 500 });
  }
  if (claim.error?.message.includes("duplicate")) {
    return new Response("already processed", { status: 200, headers: corsHeaders });
  }

  const name = event.data.attributes.name;
  const inquiry = event.data.attributes.payload?.data;
  if (!inquiry) return new Response("no inquiry", { status: 200, headers: corsHeaders });

  const userId = inquiry.attributes["reference-id"];
  if (!userId) return new Response("no ref-id", { status: 200, headers: corsHeaders });

  const dob = inquiry.attributes["birthdate"] ?? inquiry.attributes["name-first"] === undefined
    ? inquiry.attributes["birthdate"] : null;

  if (name === "inquiry.approved") {
    await supabase.from("age_verifications").upsert({
      user_id: userId,
      dob: dob ?? null,
      method: "id-verified",
      status: "approved",
      persona_inquiry_id: inquiry.id,
      persona_reference_id: userId,
      verified_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  } else if (name === "inquiry.declined") {
    await supabase.from("age_verifications").upsert({
      user_id: userId,
      dob: dob ?? null,
      method: "id-verified",
      status: "declined",
      persona_inquiry_id: inquiry.id,
      persona_reference_id: userId,
      verified_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  await supabase.from("persona_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("event_id", event.data.id);

  return new Response("ok", { status: 200, headers: corsHeaders });
});

async function verifyPersonaSignature(body: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map(kv => kv.split("=").map(s => s.trim())));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  const payload = `${t}.${body}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== v1.length) return false;
  let mismatch = 0;
  for (let i = 0; i < hex.length; i++) mismatch |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return mismatch === 0;
}

interface PersonaInquiry {
  id: string;
  attributes: {
    "reference-id"?: string;
    status?: string;
    birthdate?: string;
    "name-first"?: string;
  };
}

interface PersonaEvent {
  data: {
    id: string;
    attributes: {
      name: string;
      payload?: { data?: PersonaInquiry };
    };
  };
}
