import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { StrategyProfileEditor } from "@/components/StrategyProfileEditor";
import { TIER_LABEL } from "@/types/entitlement";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { data: ent } = useEntitlements();

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-3">
        <h1 className="text-xl font-semibold">Profile</h1>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {user ? (
              <>
                <p className="text-sm">{user.email}</p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="gold">{TIER_LABEL[ent?.tier ?? "free"]}</Badge>
                  {ent?.source && ent.source !== "default" && <Badge variant="outline">{ent.source}</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="gold" size="sm"><Link to="/billing">Manage plan</Link></Button>
                  <Button variant="outline" size="sm" onClick={() => signOut()}>Sign out</Button>
                </div>
              </>
            ) : (
              <Button asChild variant="gold" className="w-fit"><Link to="/auth">Sign in</Link></Button>
            )}
          </CardContent>
        </Card>

        <StrategyProfileEditor />
      </div>
    </PageTransition>
  );
}
