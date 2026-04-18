import { useTheme } from "next-themes";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Settings() {
  const { theme, setTheme } = useTheme();
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
      </div>
    </PageTransition>
  );
}
