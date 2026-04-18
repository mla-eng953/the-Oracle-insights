import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useHasFeature } from "@/hooks/useEntitlements";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FeatureKey } from "@/types/entitlement";

interface Props {
  feature: FeatureKey;
  requiredTier?: "pro" | "elite";
  title?: string;
  description?: string;
}

export function PaywallGate({
  feature,
  requiredTier = "pro",
  title = "Pro feature",
  description,
  children,
}: PropsWithChildren<Props>) {
  const hasAccess = useHasFeature(feature);
  if (hasAccess) return <>{children}</>;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="gold"><Lock className="h-2.5 w-2.5 mr-1" />{requiredTier.toUpperCase()}</Badge>
          <p className="text-sm font-semibold">{title}</p>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        <Button asChild variant="gold" size="sm"><Link to="/billing">Upgrade</Link></Button>
      </CardContent>
    </Card>
  );
}
