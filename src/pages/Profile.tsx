import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/hooks/useAppData";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { StrategyProfileEditor } from "@/components/StrategyProfileEditor";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { data: app } = useAppData();

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
                  <Badge variant="gold">{app?.role ?? "free"}</Badge>
                  <Badge variant="outline">{app?.subscription?.plan ?? "free"}</Badge>
                </div>
                <Button variant="outline" className="w-fit" onClick={() => signOut()}>Sign out</Button>
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
