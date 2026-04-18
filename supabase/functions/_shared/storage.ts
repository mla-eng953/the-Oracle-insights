// Storage helpers — always mint short-lived signed URLs, never expose
// raw bucket paths to clients.

import { adminClient } from "./supabase.ts";

const DEFAULT_TTL_SECONDS = 5 * 60;

export async function signUploadUrl(userId: string, filename: string, contentType: string): Promise<{ url: string; path: string; token: string }> {
  const supabase = adminClient();
  const path = `${userId}/${crypto.randomUUID()}-${sanitize(filename)}`;
  const { data, error } = await supabase.storage.from("user-content").createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "signUploadUrl failed");
  return { url: data.signedUrl, path: data.path, token: data.token };
  // Caller posts the file with `x-upsert: true` and `content-type: contentType` headers.
  void contentType;
}

export async function signDownloadUrl(path: string, ttl = DEFAULT_TTL_SECONDS): Promise<string> {
  const supabase = adminClient();
  const { data, error } = await supabase.storage.from("user-content").createSignedUrl(path, ttl);
  if (error || !data) throw new Error(error?.message ?? "signDownloadUrl failed");
  return data.signedUrl;
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}
