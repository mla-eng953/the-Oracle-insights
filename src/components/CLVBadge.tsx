import { Badge } from "@/components/ui/badge";
import { toBasisPoints } from "@/lib/clv";

export function CLVBadge({ clv }: { clv?: number }) {
  if (clv == null) return null;
  const bp = toBasisPoints(clv);
  const variant = bp > 0 ? "win" : bp < 0 ? "loss" : "muted";
  const sign = bp > 0 ? "+" : "";
  return <Badge variant={variant}>CLV {sign}{bp}bp</Badge>;
}
