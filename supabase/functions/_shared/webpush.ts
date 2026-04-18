// Web Push (RFC 8030) sender with VAPID JWT auth and aes128gcm content encoding.
// Deliberately minimal — only what we need for short notification payloads.

const encoder = new TextEncoder();

interface WebPushOptions {
  endpoint: string;
  p256dh: string;
  auth: string;
  payload: Record<string, unknown>;
  ttl?: number;
}

interface Result { ok: boolean; status: number; reason?: string }

export async function sendWebPush(opts: WebPushOptions): Promise<Result> {
  const vapidSub = Deno.env.get("VAPID_SUBJECT")!;
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;

  const audience = new URL(opts.endpoint).origin;
  const jwt = await vapidJwt({
    aud: audience, sub: vapidSub,
    pubB64: vapidPublic, privB64: vapidPrivate,
  });
  const headers: Record<string, string> = {
    Authorization: `vapid t=${jwt}, k=${vapidPublic}`,
    "Content-Type": "application/octet-stream",
    "Content-Encoding": "aes128gcm",
    TTL: String(opts.ttl ?? 60),
  };

  const body = await encryptPayload(opts, vapidPublic);
  headers["Content-Length"] = String(body.length);

  const res = await fetch(opts.endpoint, { method: "POST", headers, body });
  if (res.ok || res.status === 201 || res.status === 204) return { ok: true, status: res.status };
  const text = await res.text().catch(() => "");
  return { ok: false, status: res.status, reason: text };
}

/**
 * aes128gcm content encoding per RFC 8291. For brevity we delegate the
 * HKDF + GCM dance to a minimal implementation here; a future hardening pass
 * can swap in a vetted library (web-push on JSR or ports of tc39 primitives).
 */
async function encryptPayload(opts: WebPushOptions, _serverPub: string): Promise<Uint8Array> {
  // NOTE: Full RFC 8291 HKDF + AES-GCM encoding is 120+ lines and already
  // implemented in jsr:@negrel/webpush. Callers should install that dep;
  // we throw if it's missing so the issue surfaces loudly instead of sending
  // malformed bodies.
  try {
    const mod = await import("jsr:@negrel/webpush@0.3.0");
    const sub: Record<string, unknown> = {
      endpoint: opts.endpoint,
      keys: { p256dh: opts.p256dh, auth: opts.auth },
    };
    return await mod.encrypt(
      sub as unknown as Parameters<typeof mod.encrypt>[0],
      encoder.encode(JSON.stringify(opts.payload)),
    );
  } catch (err) {
    throw new Error(`webpush encrypt missing dependency: ${(err as Error).message}`);
  }
}

async function vapidJwt(args: { aud: string; sub: string; pubB64: string; privB64: string }): Promise<string> {
  const header = b64UrlJson({ typ: "JWT", alg: "ES256" });
  const now = Math.floor(Date.now() / 1000);
  const claims = b64UrlJson({ aud: args.aud, exp: now + 12 * 3600, sub: args.sub });
  const signingInput = `${header}.${claims}`;

  const priv = b64UrlDecode(args.privB64);
  const pub = b64UrlDecode(args.pubB64);
  const jwk = {
    kty: "EC", crv: "P-256",
    d: b64Url(priv),
    x: b64Url(pub.slice(1, 33)),
    y: b64Url(pub.slice(33, 65)),
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(signingInput)));
  return `${signingInput}.${b64Url(sig)}`;
}

function b64UrlJson(o: unknown): string { return b64Url(encoder.encode(JSON.stringify(o))); }
function b64Url(bytes: Uint8Array): string {
  let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64UrlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
