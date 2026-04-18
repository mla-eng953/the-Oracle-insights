import { PageTransition } from "@/components/PageTransition";
import { PickCard } from "@/components/PickCard";
import { Card, CardContent } from "@/components/ui/card";
import { BankrollMeter } from "@/components/BankrollMeter";
import { useTrackedPicks } from "@/hooks/useTrackedPicks";
import { useStrategyProfile } from "@/hooks/useStrategyProfile";

export default function Picks() {
  const { data: tracked, isLoading } = useTrackedPicks();
  const { data: profile } = useStrategyProfile();

  const liveExposure = (tracked ?? []).reduce((acc, p) => acc + (p.suggestedUnitStake * (profile?.unitSizeUsd ?? 0)), 0);

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-3">
        <h1 className="text-xl font-semibold">Tracked picks</h1>

        {profile && (
          <BankrollMeter
            bankrollUsd={profile.bankrollUsd}
            liveExposureUsd={liveExposure}
            maxExposurePctBankroll={profile.maxConcurrentExposurePct}
          />
        )}

        {isLoading && <Card><CardContent className="p-4 h-28 animate-pulse" /></Card>}
        {(tracked ?? []).length === 0 && !isLoading && (
          <Card><CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No active tracked picks.</p>
          </CardContent></Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(tracked ?? []).map(p => <PickCard key={p.id} pick={p} />)}
        </div>
      </div>
    </PageTransition>
  );
}
