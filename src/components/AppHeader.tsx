import { Link } from "react-router-dom";
import { Eye, Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={cn("flex items-center justify-between px-4 py-3 safe-top", compact ? "" : "border-b border-border")}>
      <Link to="/" className="flex items-center gap-2">
        <div className="h-7 w-7 grid place-items-center rounded-md bg-[hsl(var(--gold)/0.12)] ring-1 ring-[hsl(var(--gold)/0.4)] animate-pulse-glow">
          <Eye className="h-4 w-4 text-[hsl(var(--gold))]" />
        </div>
        <span className="font-semibold tracking-tight text-sm">
          The <span className="oracle-gradient-text">Oracle</span>
        </span>
      </Link>
      <div className="flex items-center gap-1">
        <Link to="/settings" aria-label="Alerts" className="h-8 w-8 grid place-items-center rounded-md hover:bg-secondary/60">
          <Bell className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/settings" aria-label="Settings" className="h-8 w-8 grid place-items-center rounded-md hover:bg-secondary/60">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </header>
  );
}
