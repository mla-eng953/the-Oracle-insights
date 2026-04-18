// Resolve the user's jurisdiction from the edge request's geo headers,
// then apply the restricted-states and blocked-country rules.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const RESTRICTED_US_STATES = new Set(["CA","TX","GA","SC","AL","MN","MO","HI","UT","ID","WI","OK","AK"]);
const BLOCKED_COUNTRIES = new Set(["CU","IR","KP","SY","RU"]);

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    // Supabase edge runtime forwards CF-like geo headers.
    const country = (req.headers.get("cf-ipcountry") || req.headers.get("x-country") || "").toUpperCase();
    const region = (req.headers.get("cf-region-code") || req.headers.get("x-region") || "").toUpperCase();
    let status: "allowed" | "restricted" | "unknown" = "unknown";
    let reason: string | undefined;
    let jurisdiction = country || "unknown";

    if (country) {
      if (BLOCKED_COUNTRIES.has(country)) { status = "restricted"; reason = "Blocked country"; }
      else if (country === "US") {
        jurisdiction = `US-${region || "??"}`;
        if (RESTRICTED_US_STATES.has(region)) { status = "restricted"; reason = "Sports-betting info restricted in this state"; }
        else { status = "allowed"; }
      } else {
        status = "allowed";
      }
    }

    const check = {
      status,
      jurisdiction,
      region,
      country,
      restrictionReason: reason,
      ageVerified: false,
      checkedAt: new Date().toISOString(),
    };

    const auth = req.headers.get("authorization");
    if (auth) {
      const supabase = adminClient();
      const { data } = await supabase.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
      if (data.user) {
        const { data: age } = await supabase.from("age_verifications").select("user_id").eq("user_id", data.user.id).maybeSingle();
        check.ageVerified = !!age;
        await supabase.from("compliance_checks").upsert({
          user_id: data.user.id, country, region, jurisdiction,
          status, restriction_reason: reason, checked_at: check.checkedAt,
        }, { onConflict: "user_id" });
      }
    }

    return jsonResponse(check);
  } catch (err) {
    console.error("[compliance-check]", err);
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});
