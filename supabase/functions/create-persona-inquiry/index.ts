// Generate a Persona Inquiry for the authenticated user and return the
// hosted-flow URL. The client redirects (or opens a native flow on iOS).
//
// Persona docs: https://docs.withpersona.com/reference/create-an-inquiry

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/supabase.ts";

const PERSONA_API = "https://api.withpersona.com/api/v1";
const PERSONA_KEY = Deno.env.get("PERSONA_API_KEY")!;
const PERSONA_TEMPLATE_ID = Deno.env.get("PERSONA_TEMPLATE_ID")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const { user } = await requireUser(req);

    const payload = {
      data: {
        attributes: {
          "inquiry-template-id": PERSONA_TEMPLATE_ID,
          "reference-id": user.id,
          "redirect-uri": `${SITE_URL}/compliance?verify=done`,
          fields: { "email-address": user.email ?? undefined },
        },
      },
    };

    const res = await fetch(`${PERSONA_API}/inquiries`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERSONA_KEY}`,
        "Content-Type": "application/json",
        "Persona-Version": "2023-01-05",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      return jsonResponse({ ok: false, error: `Persona ${res.status}: ${text}` }, 500);
    }
    const json = await res.json() as { data: { id: string; attributes: { "session-token"?: string } } };
    const sessionUrl = `https://withpersona.com/verify?inquiry-id=${json.data.id}${
      json.data.attributes["session-token"] ? `&session-token=${json.data.attributes["session-token"]}` : ""
    }`;
    return jsonResponse({ ok: true, inquiryId: json.data.id, url: sessionUrl });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[create-persona-inquiry]", err);
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});
