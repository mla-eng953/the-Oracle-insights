import { NavLink } from "react-router-dom";
import { Home, Sparkles, ListChecks, BarChart3, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/oracle", label: "Oracle", icon: Sparkles },
  { to: "/picks", label: "Picks", icon: ListChecks },
  { to: "/market-intel", label: "Intel", icon: TrendingUp },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/profile", label: "Me", icon: User },
];

export function AppNav({ variant }: { variant: "bottom" | "sidebar" }) {
  if (variant === "bottom") {
    return (
      <nav className="border-t border-border glass backdrop-blur safe-bottom">
        <ul className="grid grid-cols-6">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) => cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  isActive ? "text-[hsl(var(--gold))]" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  return (
    <aside className="w-56 border-r border-border p-3 flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            isActive ? "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]" : "text-muted-foreground hover:bg-secondary/60",
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </aside>
  );
}
