import { useState } from "react";
import { useTheme } from "next-themes";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { isOptedOut, setOptOut } from "@/lib/telemetry";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [optedOut, setOpted] = useState(isOptedOut());
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      const base = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${base}/functions/v1/export-account-data`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? `Export failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `oracle-data-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }
  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-3">
        <h1 className="text-xl font-semibold">Settings</h1>

        <Card>
          <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Dark mode</p>
              <p className="text-xs text-muted-foreground">Light mode unavailable (intentional — the product is dark-first).</p>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={(c) => setTheme(c ? "dark" : "dark")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Responsible gambling</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Set session limits, deposit-like exposure limits, and self-exclusion windows.
            </p>
            <Button asChild variant="outline" className="w-fit"><Link to="/compliance">Open controls</Link></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Telemetry</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Send anonymous crash + usage data</p>
              <p className="text-xs text-muted-foreground">Helps fix bugs faster. Zero advertising use. Opt-out respects DNT.</p>
            </div>
            <Switch
              checked={!optedOut}
              onCheckedChange={(c) => { setOptOut(!c); setOpted(!c); }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="w-fit"><Link to="/billing">Manage subscription</Link></Button>
            <Button variant="outline" className="w-fit" onClick={exportData} disabled={exporting}>
              {exporting ? "Preparing…" : "Download my data"}
            </Button>
            <Link to="/settings/delete" className="text-xs text-[hsl(var(--loss))] underline">Delete account</Link>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
