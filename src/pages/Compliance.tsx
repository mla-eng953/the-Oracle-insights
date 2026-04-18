import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IdVerify } from "@/components/IdVerify";
import { useComplianceCtx } from "@/contexts/ComplianceProvider";
import { summaryLine } from "@/lib/compliance";
import { useAgeVerificationStatus } from "@/hooks/useAgeVerificationStatus";
import { useState } from "react";

export default function Compliance() {
  const { check } = useComplianceCtx();
  const { data: idStatus } = useAgeVerificationStatus();
  const [hours, setHours] = useState<number>(24);

  function setCooloff() {
    const until = new Date(Date.now() + hours * 3600_000).toISOString();
    localStorage.setItem("oracle.cooloff.until", until);
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-3">
        <h1 className="text-xl font-semibold">Compliance & Responsible Gambling</h1>

        <Card>
          <CardHeader><CardTitle>Jurisdiction</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{check ? summaryLine(check) : "Checking…"}</p>
          </CardContent>
        </Card>

        <IdVerify status={idStatus ?? null} />

        <Card>
          <CardHeader><CardTitle>Take a break</CardTitle></CardHeader>
          <CardContent className="flex items-end gap-2">
            <div>
              <Label htmlFor="hours">Hours</Label>
              <Input id="hours" type="number" min={1} max={720} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            </div>
            <Button variant="gold" onClick={setCooloff}>Activate cool-off</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Get help</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>US: <a className="underline" href="tel:18004264653">1-800-GAMBLER</a></p>
            <p>Text: HELLO to 1-800-522-4700</p>
            <p>Chat: <a className="underline" href="https://ncpgambling.org" target="_blank" rel="noreferrer">ncpgambling.org</a></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>How your picks are graded</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>The Oracle grades with official league box scores from ESPN. Pushes and voids follow standard sportsbook conventions.</p>
            <p>Settlement disputes: tap the flag icon on any settled result.</p>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
