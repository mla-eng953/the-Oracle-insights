import { PageTransition } from "@/components/PageTransition";
import { ParlayBuilder } from "@/components/ParlayBuilder";

export default function Parlay() {
  return (
    <PageTransition>
      <div className="flex flex-col gap-3 py-3">
        <h1 className="text-xl font-semibold">Parlay builder</h1>
        <p className="text-xs text-muted-foreground">
          Same-game legs default to 0.4 correlation. Replace with measured values when available — independence assumptions inflate EV.
        </p>
        <ParlayBuilder />
      </div>
    </PageTransition>
  );
}
