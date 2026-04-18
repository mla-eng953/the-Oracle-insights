// List/search users for the Admin UI. Service-role only because we need to
// join across auth.users + user_subscriptions + user_roles.

import { preflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  try {
    const { user, supabase: userClient } = await requireUser(req);
    const { data: isAdmin } = await userClient.rpc("is_admin", { uid: user.id });
    if (!isAdmin) return jsonResponse({ ok: false, error: "admin only" }, 403);

    const { query } = await req.json().catch(() => ({})) as { query?: string };
    const supabase = adminClient();

    const { data: users, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (error) throw error;

    const filtered = users.users.filter(u => !query || u.email?.toLowerCase().includes(query.toLowerCase()));
    const ids = filtered.map(u => u.id);

    const [{ data: roles }, { data: subs }] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      supabase.from("user_subscriptions").select("user_id, plan").in("user_id", ids),
    ]);

    const roleMap = new Map<string, string>();
    for (const r of (roles ?? []) as { user_id: string; role: string }[]) {
      // Highest-priority role wins.
      const cur = roleMap.get(r.user_id);
      if (!cur || r.role === "admin" || (r.role === "pro" && cur === "free")) roleMap.set(r.user_id, r.role);
    }
    const subMap = new Map<string, string>();
    for (const s of (subs ?? []) as { user_id: string; plan: string }[]) subMap.set(s.user_id, s.plan);

    return jsonResponse({
      ok: true,
      users: filtered.map(u => ({
        id: u.id,
        email: u.email ?? "",
        role: (roleMap.get(u.id) as "admin" | "pro" | "free") ?? "free",
        plan: (subMap.get(u.id) as "free" | "pro" | "elite") ?? "free",
        created_at: u.created_at,
      })),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ ok: false, error: (err as Error).message }, 500);
  }
});
