import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useEntitlements } from "@/hooks/useEntitlements";
import { invokeFn } from "@/lib/supabase";
import { TIER_LABEL, TIER_PRICE_USD_MONTHLY, type EntitlementTier } from "@/types/entitlement";

const IS_IOS_STANDALONE =
  typeof window !== "undefined" &&
  /iPhone|iPad|iPod/.test(navigator.userAgent) &&
  (window.matchMedia?.("(display-mode: standalone)")?.matches ?? false);

export default function Billing() {
  const { data: ent } = useEntitlements();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState<EntitlementTier | null>(null);

  async function upgrade(plan: "pro" | "elite") {
    setLoading(plan);
    try {
      if (IS_IOS_STANDALONE) {
        // iOS must go through StoreKit — hand off to native via postMessage bridge.
        // The shell (WKWebView wrapper or future native app) listens for this.
        window.postMessage({ kind: "oracle:iap:purchase", plan }, "*");
        return;
      }
      const { data, error } = await invokeFn<{ ok: boolean; url?: string }>("create-checkout-session", { plan });
      if (error || !data?.url) throw error ?? new Error("no url");
      window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-3">
        <header>
          <h1 className="text-xl font-semibold">Billing</h1>
          <p className="text-xs text-muted-foreground">Current plan: {TIER_LABEL[ent?.tier ?? "free"]}</p>
          {params.get("status") === "success" && (
            <Badge variant="win" className="mt-1">Payment confirmed — entitlements updating.</Badge>
          )}
          {params.get("status") === "cancel" && (
            <Badge variant="muted" className="mt-1">Checkout cancelled.</Badge>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Plan tier="free" active={ent?.tier === "free"} />
          <Plan tier="pro" active={ent?.tier === "pro"} loading={loading === "pro"} onUpgrade={() => upgrade("pro")} />
          <Plan tier="elite" active={ent?.tier === "elite"} loading={loading === "elite"} onUpgrade={() => upgrade("elite")} />
        </div>

        <p className="text-[10px] text-muted-foreground">
          Subscriptions auto-renew. Cancel anytime in your {IS_IOS_STANDALONE ? "Apple subscription settings" : "billing portal"}.
          All analytics and content is informational — never financial advice. 21+ only.
        </p>
      </div>
    </PageTransition>
  );
}

interface PlanProps {
  tier: EntitlementTier;
  active: boolean;
  loading?: boolean;
  onUpgrade?: () => void;
}

function Plan({ tier, active, loading, onUpgrade }: PlanProps) {
  const features = FEATURES_BY_TIER[tier];
  const price = tier === "free" ? 0 : TIER_PRICE_USD_MONTHLY[tier];
  return (
    <Card className={active ? "ring-1 ring-[hsl(var(--gold))]" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{TIER_LABEL[tier]}</CardTitle>
          {active && <Badge variant="gold">Current</Badge>}
        </div>
        <p className="tabular-mono text-2xl font-semibold">
          ${price}<span className="text-xs text-muted-foreground font-normal">/mo</span>
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1 text-xs">
          {features.map(f => (
            <li key={f} className="flex items-center gap-2">
              <Check className="h-3 w-3 text-[hsl(var(--win))]" />{f}
            </li>
          ))}
        </ul>
        {!active && tier !== "free" && (
          <Button variant="gold" onClick={onUpgrade} disabled={loading}>
            {loading ? "Redirecting…" : `Upgrade to ${TIER_LABEL[tier]}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

const FEATURES_BY_TIER: Record<EntitlementTier, string[]> = {
  free: ["View daily picks", "Track 5 picks/month", "Basic analytics"],
  pro: ["Unlimited tracked picks", "Full CLV dashboard", "Strategy profiles", "Line-movement alerts"],
  elite: ["Everything in Pro", "Early access to picks", "API access", "Priority support"],
};
