import { BrowserRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { ComplianceProvider } from "@/contexts/ComplianceProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppShell } from "@/components/AppShell";
import { ComplianceGate } from "@/components/ComplianceGate";
import { AnimatedRoutes } from "@/router/AnimatedRoutes";
import { useRealtimeSettlements } from "@/hooks/useSettlements";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const PUBLIC_PATHS = new Set(["/auth", "/auth/callback", "/install"]);

function ShellRouter() {
  useRealtimeSettlements();
  useDeviceFingerprint();
  const location = useLocation();
  const isPublic = PUBLIC_PATHS.has(location.pathname);

  if (isPublic) return <AnimatedRoutes />;

  return (
    <ComplianceGate>
      <AppShell>
        <AnimatedRoutes />
      </AppShell>
    </ComplianceGate>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>
            <BrowserRouter>
              <ComplianceProvider>
                <ShellRouter />
              </ComplianceProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
