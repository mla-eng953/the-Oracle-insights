import { cn } from "@/lib/utils";
import type { Signal } from "@/types/oracle";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

function Icon({ s }: { s: Signal["sentiment"] }) {
  const cls = s === "bullish" ? "text-[hsl(var(--win))]" : s === "bearish" ? "text-[hsl(var(--loss))]" : "text-muted-foreground";
  const Cmp = s === "bullish" ? TrendingUp : s === "bearish" ? TrendingDown : Minus;
  return <Cmp className={cn("h-3.5 w-3.5", cls)} />;
}

export function SignalList({ signals }: { signals: Signal[] }) {
  if (!signals.length) return <p className="text-xs text-muted-foreground">No signals.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {signals.map((s, i) => (
        <li key={i} className="flex items-start gap-2 text-xs">
          <Icon s={s.sentiment} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{s.label}</span>
              {s.value != null && <span className="tabular-mono text-muted-foreground">{String(s.value)}</span>}
            </div>
            {s.detail && <p className="text-[11px] text-muted-foreground leading-snug">{s.detail}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
