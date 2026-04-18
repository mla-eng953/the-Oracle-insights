// Returns a short-lived signed PUT URL into the user-content bucket.
// Path is forced to `${userId}/${uuid}-${filename}` so RLS works.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/supabase.ts";
import { signUploadUrl } from "../_shared/storage.ts";

const ALLOWED = new Set(["image/png","image/jpeg","image/webp","application/pdf"]);
const MAX_BYTES = 5 * 1024 * 1024;

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const { user } = await requireUser(req);
    const { filename, contentType, sizeBytes } = await req.json() as {
      filename: string; contentType: string; sizeBytes: number;
    };
    if (!ALLOWED.has(contentType)) return jsonResponse({ ok: false, error: "type not allowed" }, 400);
    if (sizeBytes > MAX_BYTES) return jsonResponse({ ok: false, error: "file too large" }, 413);

    const signed = await signUploadUrl(user.id, filename, contentType);
    return jsonResponse({ ok: true, ...signed });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});
