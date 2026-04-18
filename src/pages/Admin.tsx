import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { AdminGate } from "@/components/AdminGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLog, useDriftSnapshot, useAdminUsers } from "@/hooks/useAdmin";
import { format } from "date-fns";

export default function Admin() {
  return (
    <AdminGate>
      <PageTransition>
        <div className="flex flex-col gap-4 py-3">
          <h1 className="text-xl font-semibold">Admin</h1>
          <Tabs defaultValue="audit">
            <TabsList>
              <TabsTrigger value="audit">Audit log</TabsTrigger>
              <TabsTrigger value="drift">Model drift</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
            <TabsContent value="audit"><AuditTab /></TabsContent>
            <TabsContent value="drift"><DriftTab /></TabsContent>
            <TabsContent value="users"><UsersTab /></TabsContent>
          </Tabs>
        </div>
      </PageTransition>
    </AdminGate>
  );
}

function AuditTab() {
  const { data, isLoading } = useAuditLog();
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {(data ?? []).map(e => (
            <li key={e.id} className="p-3 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{e.action}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono">
                  {e.actor_user_id ?? "system"} · {e.target_table ?? "—"}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {format(new Date(e.created_at), "MMM d HH:mm:ss")}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DriftTab() {
  const { data, isLoading } = useDriftSnapshot();
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground p-2">No drift findings — sample sizes too small.</p>;
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-xs">
          <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-2">Sport</th>
              <th className="p-2">n recent</th>
              <th className="p-2">n prior</th>
              <th className="p-2">CLV recent</th>
              <th className="p-2">CLV prior</th>
              <th className="p-2">Shift (bp)</th>
              <th className="p-2">p-value</th>
            </tr>
          </thead>
          <tbody className="tabular-mono">
            {data.map(d => (
              <tr key={d.sport} className="border-t border-border">
                <td className="p-2 font-semibold">{d.sport}</td>
                <td className="p-2">{d.n_recent}</td>
                <td className="p-2">{d.n_prior}</td>
                <td className="p-2">{d.mean_recent_bp.toFixed(1)}</td>
                <td className="p-2">{d.mean_prior_bp.toFixed(1)}</td>
                <td className={"p-2 font-semibold " + (Math.abs(d.mean_shift_bp) >= 50 ? "text-[hsl(var(--loss))]" : "")}>
                  {d.mean_shift_bp >= 0 ? "+" : ""}{d.mean_shift_bp.toFixed(1)}
                </td>
                <td className="p-2">{d.p.toExponential(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function UsersTab() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useAdminUsers(query);
  return (
    <div className="flex flex-col gap-3">
      <Input placeholder="Search by email…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {isLoading && <Skeleton className="h-40 w-full" />}
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {(data ?? []).map(u => (
              <li key={u.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm truncate">{u.email}</p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{u.id}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={u.role === "admin" ? "gold" : "muted"}>{u.role}</Badge>
                  <Badge variant="outline">{u.plan}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
