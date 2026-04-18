// Resolve the user's jurisdiction + VPN/proxy/Tor risk, then apply the
// restricted-states and blocked-country rules plus anonymizer blocking.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { resolveGeo } from "../_shared/geoip.ts";

const RESTRICTED_US_STATES = new Set(["CA","TX","GA","SC","AL","MN","MO","HI","UT","ID","WI","OK","AK"]);
const BLOCKED_COUNTRIES = new Set(["CU","IR","KP","SY","RU"]);
const BLOCK_ANONYMIZERS = (Deno.env.get("COMPLIANCE_BLOCK_ANONYMIZERS") ?? "1") === "1";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const geo = await resolveGeo(req);
    const country = geo.country;
    const region = geo.region;
    let status: "allowed" | "restricted" | "unknown" = "unknown";
    let reason: string | undefined;
    let jurisdiction = country || "unknown";

    if (BLOCK_ANONYMIZERS && (geo.isVpn || geo.isTor || geo.isHosting)) {
      status = "restricted";
      reason = geo.isTor ? "Tor exit node" : geo.isVpn ? "VPN detected" : "Hosting provider / datacenter";
    } else if (country) {
      if (BLOCKED_COUNTRIES.has(country)) { status = "restricted"; reason = "Blocked country"; }
      else if (country === "US") {
        jurisdiction = `US-${region || "??"}`;
        if (RESTRICTED_US_STATES.has(region)) { status = "restricted"; reason = "Sports-betting info restricted in this state"; }
        else status = "allowed";
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
      isVpn: geo.isVpn,
      isHosting: geo.isHosting,
      isTor: geo.isTor,
      riskScore: geo.riskScore,
      checkedAt: new Date().toISOString(),
    };

    const auth = req.headers.get("authorization");
    if (auth) {
      const supabase = adminClient();
      const { data } = await supabase.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
      if (data.user) {
        const { data: age } = await supabase.from("age_verifications")
          .select("user_id, status").eq("user_id", data.user.id).maybeSingle();
        check.ageVerified = !!age && age.status === "approved";
        await supabase.from("compliance_checks").upsert({
          user_id: data.user.id,
          country, region, jurisdiction,
          status, restriction_reason: reason,
          checked_at: check.checkedAt,
        }, { onConflict: "user_id" });
      }
    }

    return jsonResponse(check);
  } catch (err) {
    console.error("[compliance-check]", err);
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});
