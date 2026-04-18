import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Install() {
  return (
    <PageTransition>
      <div className="min-h-dvh flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle>Install The Oracle</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">iOS:</strong> open in Safari → Share → Add to Home Screen.</p>
            <p><strong className="text-foreground">Android:</strong> Chrome three-dot menu → Install app.</p>
            <p><strong className="text-foreground">Desktop:</strong> Chrome / Edge address bar → install icon.</p>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
