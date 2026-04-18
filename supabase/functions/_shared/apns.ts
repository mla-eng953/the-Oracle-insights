// APNs HTTP/2 sender using JWT token-based auth (AuthKey .p8 file).
// Requires APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (PEM), APNS_BUNDLE_ID.
//
// Apple rotates the JWT no more than once/hour but expects fresh tokens —
// we cache for 50 minutes to stay well inside the 60-minute expiry window.

interface ApnsPayload {
  aps: {
    alert: { title: string; body: string };
    sound?: string;
    badge?: number;
    "thread-id"?: string;
    "interruption-level"?: "passive" | "active" | "time-sensitive" | "critical";
  };
  [k: string]: unknown;
}

interface ApnsOptions {
  deviceToken: string;
  topic: string;
  payload: ApnsPayload;
  pushType?: "alert" | "background";
  priority?: 5 | 10;
  collapseId?: string;
  production?: boolean;
}

let cachedToken: { value: string; expires: number } | null = null;

export async function sendApns(opts: ApnsOptions): Promise<{ ok: boolean; status: number; reason?: string }> {
  const jwt = await getAppleJwt();
  const host = opts.production
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";

  const res = await fetch(`${host}/3/device/${opts.deviceToken}`, {
    method: "POST",
    headers: {
      Authorization: `bearer ${jwt}`,
      "apns-topic": opts.topic,
      "apns-push-type": opts.pushType ?? "alert",
      "apns-priority": String(opts.priority ?? 10),
      ...(opts.collapseId ? { "apns-collapse-id": opts.collapseId } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(opts.payload),
  });

  if (res.ok) return { ok: true, status: res.status };
  const body = await res.json().catch(() => ({})) as { reason?: string };
  return { ok: false, status: res.status, reason: body.reason };
}

async function getAppleJwt(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.value;

  const keyId = Deno.env.get("APNS_KEY_ID")!;
  const teamId = Deno.env.get("APNS_TEAM_ID")!;
  const pem = Deno.env.get("APNS_PRIVATE_KEY")!;

  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: "ES256", kid: keyId })));
  const now = Math.floor(Date.now() / 1000);
  const claims = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ iss: teamId, iat: now })));
  const signingInput = `${header}.${claims}`;

  const key = await importEcPrivateKey(pem);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;
  cachedToken = { value: jwt, expires: Date.now() + 50 * 60_000 };
  return jwt;
}

async function importEcPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----/, "")
                  .replace(/-----END PRIVATE KEY-----/, "")
                  .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

function base64UrlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
