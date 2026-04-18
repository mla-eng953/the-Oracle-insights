import { type PropsWithChildren } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { AppHeader } from "./AppHeader";
import { AppNav } from "./AppNav";
import { OfflineBanner } from "./OfflineBanner";
import { ResponsibleGamblingBanner } from "./ResponsibleGamblingBanner";

export function AppShell({ children }: PropsWithChildren) {
  const mobile = useIsMobile();
  if (mobile) {
    return (
      <div className="flex flex-col h-dvh">
        <AppHeader />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto px-3 pb-4">{children}</main>
        <AppNav variant="bottom" />
        <ResponsibleGamblingBanner />
      </div>
    );
  }
  return (
    <div className="flex h-dvh">
      <AppNav variant="sidebar" />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto px-6 py-4">{children}</main>
        <ResponsibleGamblingBanner />
      </div>
    </div>
  );
}
