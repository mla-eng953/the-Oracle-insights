import { formatPct } from "@/lib/utils";
import type { EdgeEstimate } from "@/types/oracle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function EdgeDisplay({ edge, size = "md" }: { edge: EdgeEstimate; size?: "sm" | "md" | "lg" }) {
  const ciCrossesZero = edge.edgeLow < 0 && edge.edgeHigh > 0;
  const cls = ciCrossesZero
    ? "text-muted-foreground"
    : edge.edge > 0 ? "text-[hsl(var(--win))]" : "text-[hsl(var(--loss))]";
  const sizeCls = size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-sm";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`tabular-mono font-semibold ${cls} ${sizeCls}`}>
          {edge.edge > 0 ? "+" : ""}{formatPct(edge.edge)}
          <span className="ml-1 text-[10px] text-muted-foreground">
            ± {formatPct((edge.edgeHigh - edge.edgeLow) / 2, 1)}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        Model fair prob {formatPct(edge.trueProb)} [{formatPct(edge.trueProbLow)}, {formatPct(edge.trueProbHigh)}].
        Confidence {edge.confidence}. {ciCrossesZero ? "CI crosses zero — caution." : "CI does not cross zero."}
      </TooltipContent>
    </Tooltip>
  );
}
