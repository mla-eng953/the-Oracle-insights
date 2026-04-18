import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight, Sparkles, ListChecks, BarChart3, TrendingUp, User } from "lucide-react";

const STORAGE_KEY = "oracle.onboarding.dismissed";

interface Step {
  title: string;
  body: string;
  icon: typeof Sparkles;
  cta?: { label: string; to: string };
}

const STEPS: Step[] = [
  {
    title: "The Oracle reads the closing line.",
    body: "Picks are scored against the eventual closing odds — CLV, not ROI, is the primary edge metric.",
    icon: Sparkles,
  },
  {
    title: "Tier-filter what you trust.",
    body: "Conservative, Moderate, Aggressive map to confidence + edge bands. Adjust min-edge in your strategy profile.",
    icon: ListChecks,
    cta: { label: "Open Oracle picks", to: "/oracle" },
  },
  {
    title: "Track to learn.",
    body: "Tracked picks contribute to your personal CLV, ROI, and per-sport breakdowns. They never get bet for you.",
    icon: BarChart3,
    cta: { label: "See analytics", to: "/analytics" },
  },
  {
    title: "Shop the line.",
    body: "Market Intel surfaces sharp consensus, steam moves, and public-vs-sharp splits across books.",
    icon: TrendingUp,
    cta: { label: "Open Market Intel", to: "/market-intel" },
  },
  {
    title: "Set your bankroll.",
    body: "All stake recommendations respect your bankroll, Kelly fraction, and per-pick cap. Set them once.",
    icon: User,
    cta: { label: "Strategy profile", to: "/profile" },
  },
];

export function OnboardingTutorial() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;
    const created = new Date(user.created_at ?? 0).getTime();
    const ageDays = (Date.now() - created) / 86400_000;
    // Only show for accounts <7 days old.
    if (ageDays > 7) return;
    setOpen(true);
  }, [user]);

  function dismiss() {
    setOpen(false);
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, "1");
  }

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/60 backdrop-blur-sm p-3 sm:p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-md"
        >
          <Card className="glass-strong">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 grid place-items-center rounded-md bg-[hsl(var(--gold)/0.15)] ring-1 ring-[hsl(var(--gold)/0.4)]">
                  <Icon className="h-4 w-4 text-[hsl(var(--gold))]" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Step {step + 1} of {STEPS.length}
                </p>
              </div>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="text-sm text-muted-foreground">{s.body}</p>

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={dismiss}>Skip</Button>
                <div className="flex items-center gap-2">
                  {s.cta && (
                    <Button asChild variant="outline" size="sm" onClick={dismiss}>
                      <Link to={s.cta.to}>{s.cta.label}</Link>
                    </Button>
                  )}
                  <Button
                    variant="gold" size="sm"
                    onClick={() => isLast ? dismiss() : setStep(step + 1)}
                  >
                    {isLast ? "Done" : <>Next <ChevronRight className="h-3.5 w-3.5" /></>}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-1 pt-1">
                {STEPS.map((_, i) => (
                  <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= step ? "bg-[hsl(var(--gold))]" : "bg-secondary"
                  }`} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
