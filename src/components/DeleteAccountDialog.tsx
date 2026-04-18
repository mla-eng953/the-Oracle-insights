import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { invokeFn } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useHaptic } from "@/hooks/useHaptic";

export function DeleteAccountForm() {
  const { signOut } = useAuth();
  const nav = useNavigate();
  const haptic = useHaptic();
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!acknowledged) { setErr("Please acknowledge the consequences first."); return; }
    if (confirmation !== "DELETE") { setErr("Type DELETE to confirm."); return; }
    setLoading(true);
    try {
      const { error } = await invokeFn("delete-account", { confirmation });
      if (error) throw error;
      haptic("warning");
      await signOut();
      nav("/auth", { replace: true });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-[hsl(var(--loss)/0.4)]">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--loss))]">Delete account</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Permanently deletes your profile, tracked picks, strategy profile, age verification, and
          subscription state. This is irreversible. Active subscriptions must be cancelled first
          (Stripe via Billing, Apple via iOS Settings).
        </p>

        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I understand my data will be removed within 30 days, except records required by law
            (payment receipts retained 7 years).
          </span>
        </label>

        <div>
          <Label htmlFor="confirm">Type DELETE to confirm</Label>
          <Input id="confirm" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="DELETE" />
        </div>

        {err && <p className="text-xs text-[hsl(var(--loss))]">{err}</p>}

        <Button variant="destructive" onClick={submit} disabled={loading} className="w-fit">
          {loading ? "Deleting…" : "Delete my account"}
        </Button>
      </CardContent>
    </Card>
  );
}
