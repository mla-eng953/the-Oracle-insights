import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export function ResponsibleGamblingBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      <span>
        Entertainment only. 21+. If you or someone you know has a gambling problem, call
        {" "}<a href="tel:18004264653" className="underline">1-800-GAMBLER</a>.
        {" "}<Link to="/compliance" className="underline">Limits & self-exclude</Link>.
      </span>
    </div>
  );
}
