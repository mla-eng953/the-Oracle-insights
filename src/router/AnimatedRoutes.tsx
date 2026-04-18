import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const Index = lazy(() => import("@/pages/Index"));
const OracleAnalysis = lazy(() => import("@/pages/OracleAnalysis"));
const Picks = lazy(() => import("@/pages/Picks"));
const PickDetails = lazy(() => import("@/pages/PickDetails"));
const Results = lazy(() => import("@/pages/Results"));
const MarketIntel = lazy(() => import("@/pages/MarketIntel"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Profile = lazy(() => import("@/pages/Profile"));
const Settings = lazy(() => import("@/pages/Settings"));
const Compliance = lazy(() => import("@/pages/Compliance"));
const Billing = lazy(() => import("@/pages/Billing"));
const Auth = lazy(() => import("@/pages/Auth"));
const Install = lazy(() => import("@/pages/Install"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function Fallback() {
  return (
    <div className="p-3 flex flex-col gap-3">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<Fallback />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Index />} />
          <Route path="/oracle" element={<OracleAnalysis />} />
          <Route path="/picks" element={<Picks />} />
          <Route path="/picks/:id" element={<PickDetails />} />
          <Route path="/results" element={<Results />} />
          <Route path="/market-intel" element={<MarketIntel />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<Auth />} />
          <Route path="/install" element={<Install />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}
