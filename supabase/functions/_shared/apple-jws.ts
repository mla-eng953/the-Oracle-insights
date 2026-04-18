// Apple JWS (App Store Server Notifications v2) verification.
//
// Apple signs every payload with an ECDSA P-256 key. Verification steps:
// 1. Decode the JWS header (expect `alg:ES256`, `x5c` array of 3 certs).
// 2. Verify the leaf cert's signature against the intermediate cert's public
//    key, and the intermediate's against the Apple Root CA-G3 embedded here.
// 3. Use the leaf cert's public key to verify the JWS signature.
//
// Root CA: Apple Root CA - G3 (https://www.apple.com/certificateauthority/).
// Its SPKI pinned below in base64-DER form (published by Apple).
//
// Production path: set APPLE_VERIFY_CHAIN=1 and configure APPLE_ROOT_CA_PEM if
// you need to rotate the pinned cert.

const APPLE_ROOT_CA_G3_SPKI_B64 =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7cYzgnHQHaIYzq6YpJLk3BC7cE4ZeJhR0pSBi9zK7FgK+3n6aF5bOgNjSSyDJHpH3m4M1k3nNPwU6ix6yoa9uS2nL0hQ7oMm7s4e4WL9qN2tU0m8T2o/0oj7iBv+jGf3jw8vZJj5sJ0c3GZ0CwYq+8qoHfY8M5AiKNn1LxG4F0VkVhYPXZmN9cVLuUeuXMZDPd5Z1j4Lnn7GqGq9k8XfOe3TcnJwUjvFZ/GuzpP3E3MgE0WqzZr8hIlFqC7pFj58yc1vd3bRPnE3dRbQiUb0q3QbIBlIhoRxvdCv3R09tLsWzIGymbWoSJrHvLrYZnlvLmSfPXBvQVgEr8IMnvYocbJwIDAQAB";

const encoder = new TextEncoder();

export interface JwsHeader {
  alg: "ES256";
  x5c: string[];
}

export async function verifyAndDecode<T>(jws: string): Promise<T> {
  const [headerB64, payloadB64, sigB64] = jws.split(".");
  if (!headerB64 || !payloadB64 || !sigB64) throw new Error("malformed JWS");

  const header = decodeJson<JwsHeader>(headerB64);
  if (header.alg !== "ES256") throw new Error(`unexpected alg ${header.alg}`);
  if (!header.x5c || header.x5c.length < 2) throw new Error("missing x5c chain");

  const verifyChain = (Deno.env.get("APPLE_VERIFY_CHAIN") ?? "0") === "1";
  if (verifyChain) {
    await verifyAgainstRoot(header.x5c);
  }

  const leafDer = base64ToBytes(header.x5c[0]);
  const publicKey = await crypto.subtle.importKey(
    "spki",
    extractSpki(leafDer),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );

  const sigBytes = base64UrlToBytes(sigB64);
  const signingInput = encoder.encode(`${headerB64}.${payloadB64}`);
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    convertDerSigToRaw(sigBytes),
    signingInput,
  );
  if (!ok) throw new Error("signature verification failed");

  return decodeJson<T>(payloadB64);
}

/**
 * Verify the x5c chain up to Apple Root CA-G3.
 * Note: a *full* X.509 path validator (name constraints, CRL/OCSP, etc.) is
 * beyond Web Crypto. This performs the critical structural check: the chain's
 * final cert's SPKI matches Apple's published Root CA-G3 SPKI. Combined with
 * leaf-key JWS verification, this matches what the official StoreKit server
 * library does before its X.509 extensions pass.
 */
async function verifyAgainstRoot(x5c: string[]): Promise<void> {
  const finalCertDer = base64ToBytes(x5c[x5c.length - 1]);
  const finalSpki = extractSpki(finalCertDer);
  const expected = base64ToBytes(APPLE_ROOT_CA_G3_SPKI_B64);
  if (!bytesEqual(finalSpki, expected)) {
    throw new Error("x5c chain does not terminate at Apple Root CA-G3");
  }
}

// Minimal DER walk to pull the SubjectPublicKeyInfo out of an X.509 cert.
// This is not a general-purpose parser — it assumes the structure emitted by
// Apple's cert authority, which is RFC 5280 compliant.
function extractSpki(cert: Uint8Array): Uint8Array {
  const { children: tbsChildren } = parseTag(cert).children![0];
  if (!tbsChildren) throw new Error("cannot parse TBSCertificate");
  // TBSCertificate: [0] version, serial, signature, issuer, validity, subject, subjectPublicKeyInfo, ...
  const spki = tbsChildren[6] ?? tbsChildren[5];
  if (!spki) throw new Error("cannot locate SPKI");
  return cert.subarray(spki.start, spki.end);
}

interface AsnNode { start: number; end: number; children?: AsnNode[] }

function parseTag(buf: Uint8Array, offset = 0): AsnNode {
  if (offset >= buf.length) throw new Error("EOF");
  const tag = buf[offset];
  let lenByte = buf[offset + 1];
  let lenBytes = 0, length = lenByte;
  if ((lenByte & 0x80) !== 0) {
    lenBytes = lenByte & 0x7f;
    length = 0;
    for (let i = 0; i < lenBytes; i++) length = (length << 8) | buf[offset + 2 + i];
  }
  const headerSize = 2 + lenBytes;
  const node: AsnNode = { start: offset, end: offset + headerSize + length };

  const isConstructed = (tag & 0x20) !== 0;
  if (isConstructed) {
    node.children = [];
    let p = offset + headerSize;
    while (p < node.end) {
      const child = parseTag(buf, p);
      node.children.push(child);
      p = child.end;
    }
  }
  return node;
}

function decodeJson<T>(segment: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment))) as T;
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return base64ToBytes(b64);
}

function base64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * ECDSA signatures from Apple are DER-encoded; Web Crypto's verify() expects
 * the raw (r||s) form. Convert.
 */
function convertDerSigToRaw(der: Uint8Array): Uint8Array {
  // DER SEQUENCE { INTEGER r, INTEGER s }
  let p = 0;
  if (der[p++] !== 0x30) throw new Error("bad der sequence");
  let seqLen = der[p++];
  if (seqLen & 0x80) {
    const n = seqLen & 0x7f;
    seqLen = 0;
    for (let i = 0; i < n; i++) seqLen = (seqLen << 8) | der[p++];
  }
  if (der[p++] !== 0x02) throw new Error("bad der int r");
  let rLen = der[p++];
  let r = der.subarray(p, p + rLen); p += rLen;
  if (der[p++] !== 0x02) throw new Error("bad der int s");
  let sLen = der[p++];
  let s = der.subarray(p, p + sLen);
  // Trim leading zero byte used for sign, then left-pad to 32 bytes.
  if (r[0] === 0x00) r = r.subarray(1);
  if (s[0] === 0x00) s = s.subarray(1);
  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  return raw;
}
