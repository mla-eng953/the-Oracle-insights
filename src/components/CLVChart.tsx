import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import type { CLVPoint } from "@/lib/clv";
import { toBasisPoints } from "@/lib/clv";

export function CLVChart({ points }: { points: CLVPoint[] }) {
  const data = [...points]
    .sort((a, b) => new Date(a.settledAt).getTime() - new Date(b.settledAt).getTime())
    .reduce<Array<{ idx: number; rolling: number; bp: number }>>((acc, p, i) => {
      const prior = acc[i - 1]?.rolling ?? 0;
      const next = prior + toBasisPoints(p.clv);
      acc.push({ idx: i + 1, rolling: next, bp: toBasisPoints(p.clv) });
      return acc;
    }, []);
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="idx" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
          <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
          <ReferenceLine y={0} stroke="hsl(var(--muted))" />
          <Line type="monotone" dataKey="rolling" stroke="hsl(var(--gold))" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
