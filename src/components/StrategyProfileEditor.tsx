import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useStrategyProfile, useUpdateStrategyProfile } from "@/hooks/useStrategyProfile";
import { formatUsd } from "@/lib/utils";

export function StrategyProfileEditor() {
  const { data: profile } = useStrategyProfile();
  const update = useUpdateStrategyProfile();
  if (!profile) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <Label htmlFor="bankroll">Bankroll ({formatUsd(profile.bankrollUsd)})</Label>
          <Input
            id="bankroll" type="number" min={100} step={100}
            value={profile.bankrollUsd}
            onChange={(e) => update.mutate({ bankrollUsd: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="unit">Unit size ({formatUsd(profile.unitSizeUsd)})</Label>
          <Input
            id="unit" type="number" min={1} step={1}
            value={profile.unitSizeUsd}
            onChange={(e) => update.mutate({ unitSizeUsd: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Kelly fraction: {profile.kellyFraction.toFixed(2)}</Label>
          <Slider
            min={0.1} max={1} step={0.05}
            value={[profile.kellyFraction]}
            onValueChange={([v]) => update.mutate({ kellyFraction: v })}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            0.25 = quarter-Kelly (recommended). Full-Kelly is aggressive and variance-heavy.
          </p>
        </div>
        <div>
          <Label>Max per-pick: {profile.maxPerPickPctBankroll}% bankroll</Label>
          <Slider
            min={0.5} max={10} step={0.5}
            value={[profile.maxPerPickPctBankroll]}
            onValueChange={([v]) => update.mutate({ maxPerPickPctBankroll: v })}
          />
        </div>
        <div>
          <Label>Minimum edge to surface: {profile.minEdgePct}%</Label>
          <Slider
            min={0} max={10} step={0.5}
            value={[profile.minEdgePct]}
            onValueChange={([v]) => update.mutate({ minEdgePct: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Auto-track picks that match profile</p>
            <p className="text-xs text-muted-foreground">Requires Pro.</p>
          </div>
          <Switch
            checked={profile.autoTrack}
            onCheckedChange={(c) => update.mutate({ autoTrack: c })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
