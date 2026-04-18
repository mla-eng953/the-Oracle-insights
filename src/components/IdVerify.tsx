import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { invokeFn } from "@/lib/supabase";

interface Props {
  status: "self-attested" | "pending" | "approved" | "declined" | "expired" | null;
}

export function IdVerify({ status }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setLoading(true); setErr(null);
    try {
      const { data, error } = await invokeFn<{ ok: boolean; url?: string }>("create-persona-inquiry");
      if (error || !data?.url) throw error ?? new Error("no url");
      window.location.href = data.url;
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (status === "approved") {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[hsl(var(--win))]" />
          <div>
            <p className="text-sm font-medium">Identity verified</p>
            <p className="text-xs text-muted-foreground">Full access unlocked.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify your identity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Required by Apple and by several state regulators for sports-betting-adjacent apps.
          Takes ~60 seconds via government ID + selfie.
        </p>
        {status && status !== "self-attested" && (
          <Badge variant={status === "declined" ? "loss" : "muted"}>{status}</Badge>
        )}
        {err && <p className="text-xs text-[hsl(var(--loss))]">{err}</p>}
        <Button variant="gold" onClick={start} disabled={loading} className="w-fit">
          {loading ? "Opening…" : "Start verification"}
        </Button>
      </CardContent>
    </Card>
  );
}
