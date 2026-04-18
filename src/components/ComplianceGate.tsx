import { useState, type PropsWithChildren } from "react";
import { useComplianceCtx } from "@/contexts/ComplianceProvider";
import { markAgeVerified, useCompliance } from "@/hooks/useCompliance";
import { hasValidAge, summaryLine } from "@/lib/compliance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MIN_AGE = Number(import.meta.env.VITE_COMPLIANCE_MIN_AGE ?? 21);

export function ComplianceGate({ children }: PropsWithChildren) {
  const { check, loading, gated } = useComplianceCtx();
  const [dob, setDob] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const { refetch } = useCompliance();

  if (loading) return null;

  if (!gated) return <>{children}</>;

  if (check?.status === "restricted") {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Not available in your region</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              The Oracle surfaces sports-betting analysis. This content is restricted in{" "}
              <span className="font-mono">{check.jurisdiction}</span>.
            </p>
            <Badge variant="loss">{summaryLine(check)}</Badge>
            <p className="text-xs text-muted-foreground">
              If you believe this is incorrect, disable VPN/proxy and reload.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Verify your age</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            You must be {MIN_AGE}+ to use The Oracle. This is informational content only — never advice.
          </p>
          <div>
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          {err && <p className="text-xs text-[hsl(var(--loss))]">{err}</p>}
          <Button
            variant="gold"
            onClick={() => {
              if (!hasValidAge(dob, MIN_AGE)) {
                setErr(`You must be ${MIN_AGE}+ to continue.`);
                return;
              }
              markAgeVerified(dob);
              refetch();
            }}
          >
            Continue
          </Button>
          <p className="text-[10px] text-muted-foreground leading-snug">
            By continuing you acknowledge: (1) The Oracle is not a sportsbook. (2) Picks are analysis, not advice.
            (3) You will not rely on the app if you have a gambling problem. Call 1-800-GAMBLER.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
