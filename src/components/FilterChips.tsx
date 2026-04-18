import { cn } from "@/lib/utils";

interface Chip<T> { value: T; label: string; count?: number }

interface Props<T> {
  values: Chip<T>[];
  active: T | null;
  onChange: (v: T | null) => void;
  allowClear?: boolean;
}

export function FilterChips<T extends string>({ values, active, onChange, allowClear = true }: Props<T>) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 no-scrollbar">
      {allowClear && (
        <button
          onClick={() => onChange(null)}
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
            !active ? "bg-[hsl(var(--gold))] text-[hsl(0_0%_8%)]" : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70",
          )}
        >All</button>
      )}
      {values.map(v => (
        <button
          key={String(v.value)}
          onClick={() => onChange(v.value)}
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
            active === v.value ? "bg-[hsl(var(--gold))] text-[hsl(0_0%_8%)]" : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70",
          )}
        >
          {v.label}
          {v.count != null && <span className="ml-1 opacity-70 tabular-mono">{v.count}</span>}
        </button>
      ))}
    </div>
  );
}
