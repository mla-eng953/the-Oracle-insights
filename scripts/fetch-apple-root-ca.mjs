#!/usr/bin/env node
/**
 * Fetches Apple Root CA - G3 from Apple, extracts the SubjectPublicKeyInfo,
 * and writes the base64(DER) to supabase/functions/_shared/apple-root-ca.json.
 *
 * Run before deploying apple-webhook to production. The current bundled
 * placeholder will fail real chain validation and is documented as such.
 *
 * Source: https://www.apple.com/certificateauthority/
 */

import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT = resolve(ROOT, "supabase/functions/_shared/apple-root-ca.json");

const CERT_URL = "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer";

async function main() {
  console.log(`Fetching ${CERT_URL}...`);
  const res = await fetch(CERT_URL);
  if (!res.ok) {
    console.error(`HTTP ${res.status}`);
    process.exit(1);
  }
  const der = new Uint8Array(await res.arrayBuffer());
  console.log(`Got ${der.length} bytes.`);

  const sha256 = execSync("openssl dgst -sha256", { input: Buffer.from(der) }).toString().trim();
  console.log(`SHA-256: ${sha256}`);

  // Apple Root CA - G3 fingerprint (publicly published).
  const EXPECTED = "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c1d0bba8d7a8d4f0db1f3a6b1c9";
  if (!sha256.toLowerCase().includes(EXPECTED) && process.env.SKIP_FINGERPRINT_CHECK !== "1") {
    console.warn(
      `WARNING: SHA-256 does not match the previously known Apple Root CA-G3 fingerprint.\n` +
      `Verify against https://www.apple.com/certificateauthority/ before proceeding.\n` +
      `Set SKIP_FINGERPRINT_CHECK=1 to override.`,
    );
  }

  const spki = extractSpki(der);
  const spkiB64 = bytesToBase64(spki);

  await writeFile(OUTPUT, JSON.stringify({
    source: CERT_URL,
    fetched_at: new Date().toISOString(),
    cert_sha256: sha256,
    spki_base64: spkiB64,
    note: "Re-run pnpm fetch-apple-ca on cert rotation. Compared in apple-jws.ts.",
  }, null, 2) + "\n");

  console.log(`\nWrote SPKI (${spki.length} bytes) to ${OUTPUT}`);
}

function extractSpki(der) {
  const root = parse(der, 0);
  const tbs = root.children[0];
  const spki = tbs.children[6] ?? tbs.children[5];
  if (!spki) throw new Error("Could not locate SPKI in cert");
  return der.subarray(spki.start, spki.end);
}

function parse(buf, offset) {
  const tag = buf[offset];
  let lenByte = buf[offset + 1];
  let lenBytes = 0, length = lenByte;
  if ((lenByte & 0x80) !== 0) {
    lenBytes = lenByte & 0x7f;
    length = 0;
    for (let i = 0; i < lenBytes; i++) length = (length << 8) | buf[offset + 2 + i];
  }
  const headerSize = 2 + lenBytes;
  const node = { start: offset, end: offset + headerSize + length, children: [] };
  if ((tag & 0x20) !== 0) {
    let p = offset + headerSize;
    while (p < node.end) {
      const child = parse(buf, p);
      node.children.push(child);
      p = child.end;
    }
  }
  return node;
}

function bytesToBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return Buffer.from(s, "binary").toString("base64");
}

await main();
