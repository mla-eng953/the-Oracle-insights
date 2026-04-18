import type { PropsWithChildren } from "react";
import { useAppData } from "@/hooks/useAppData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

export function AdminGate({ children }: PropsWithChildren) {
  const { data, isLoading } = useAppData();
  if (isLoading) return null;
  if (!data?.isAdmin) {
    return (
      <div className="grid place-items-center min-h-dvh p-6">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Admins only</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">This page requires the admin role.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <>{children}</>;
}
