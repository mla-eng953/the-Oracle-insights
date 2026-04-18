// MaxMind GeoIP2 Precision Insights integration.
// Falls back to CF-style geo headers if MAXMIND_* env vars aren't configured,
// so local dev still works.

export interface GeoResult {
  country: string;
  region: string;
  city?: string;
  isVpn: boolean;
  isHosting: boolean;
  isTor: boolean;
  riskScore: number;
}

export async function resolveGeo(req: Request): Promise<GeoResult> {
  const accountId = Deno.env.get("MAXMIND_ACCOUNT_ID");
  const licenseKey = Deno.env.get("MAXMIND_LICENSE_KEY");
  const ip = resolveIp(req);

  if (accountId && licenseKey && ip) {
    try {
      return await maxmindLookup(accountId, licenseKey, ip);
    } catch (err) {
      console.error("[geoip] MaxMind failed, falling back to headers", err);
    }
  }

  return headerFallback(req);
}

async function maxmindLookup(accountId: string, licenseKey: string, ip: string): Promise<GeoResult> {
  const url = `https://geoip.maxmind.com/geoip/v2.1/insights/${encodeURIComponent(ip)}`;
  const auth = btoa(`${accountId}:${licenseKey}`);
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`MaxMind ${res.status}: ${await res.text()}`);
  const data = await res.json() as MaxMindInsights;
  return {
    country: data.country?.iso_code ?? "",
    region: data.subdivisions?.[0]?.iso_code ?? "",
    city: data.city?.names?.en,
    isVpn: !!data.traits?.is_anonymous_vpn,
    isHosting: !!data.traits?.is_hosting_provider,
    isTor: !!data.traits?.is_tor_exit_node,
    riskScore: data.traits?.user_count ? 0 : 0,  // Score derived downstream from composite flags.
  };
}

function headerFallback(req: Request): GeoResult {
  const country = (req.headers.get("cf-ipcountry") || req.headers.get("x-country") || "").toUpperCase();
  const region = (req.headers.get("cf-region-code") || req.headers.get("x-region") || "").toUpperCase();
  return { country, region, isVpn: false, isHosting: false, isTor: false, riskScore: 0 };
}

function resolveIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

interface MaxMindInsights {
  country?: { iso_code?: string };
  subdivisions?: Array<{ iso_code?: string }>;
  city?: { names?: { en?: string } };
  traits?: {
    is_anonymous_vpn?: boolean;
    is_hosting_provider?: boolean;
    is_tor_exit_node?: boolean;
    is_anonymous_proxy?: boolean;
    user_count?: number;
  };
}
