import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PickCard } from "./PickCard";
import type { Pick, Sport } from "@/types/oracle";

export interface EventHubConfig {
  id: string;
  title: string;
  subtitle?: string;
  sport: Sport;
  accent?: string;
  startsAt: string;
  endsAt: string;
  tagline?: string;
}

export function EventHub({ config, picks }: { config: EventHubConfig; picks: Pick[] }) {
  const active = Date.now() < new Date(config.endsAt).getTime();
  return (
    <div className="flex flex-col gap-4">
      <Card
        className="overflow-hidden"
        style={config.accent ? { background: `linear-gradient(135deg, ${config.accent}22, transparent 70%)` } : undefined}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={active ? "gold" : "muted"}>{active ? "Active" : "Concluded"}</Badge>
            <Badge variant="outline">{config.sport}</Badge>
          </div>
          <h2 className="text-xl font-semibold">{config.title}</h2>
          {config.subtitle && <p className="text-sm text-muted-foreground">{config.subtitle}</p>}
          {config.tagline && <p className="mt-2 text-xs text-muted-foreground italic">{config.tagline}</p>}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {picks.map(p => <PickCard key={p.id} pick={p} />)}
      </div>
    </div>
  );
}
