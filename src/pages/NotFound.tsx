import { Link } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageTransition>
      <div className="min-h-dvh grid place-items-center p-6 text-center">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">The Oracle shrugs</p>
          <h1 className="text-3xl font-semibold mt-2">404</h1>
          <p className="text-sm text-muted-foreground mt-2">No edge found on this route.</p>
          <Button asChild variant="gold" className="mt-4"><Link to="/">Back home</Link></Button>
        </div>
      </div>
    </PageTransition>
  );
}
