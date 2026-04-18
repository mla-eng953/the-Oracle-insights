import { useEffect } from "react";
import { invokeFn } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { captureException } from "@/lib/telemetry";

const FP_PUBLIC_KEY = import.meta.env.VITE_FINGERPRINT_PUBLIC_KEY as string | undefined;
const FP_REGION = (import.meta.env.VITE_FINGERPRINT_REGION as string | undefined) ?? "us";

let reportedFor: string | null = null;

export function useDeviceFingerprint() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !FP_PUBLIC_KEY) return;
    if (reportedFor === user.id) return;
    reportedFor = user.id;

    (async () => {
      try {
        const mod = await import(/* @vite-ignore */ `https://fpjscdn.net/v3/${FP_PUBLIC_KEY}`);
        const fp = await mod.load({ region: FP_REGION });
        const result = await fp.get();
        await invokeFn("check-device-fingerprint", {
          requestId: result.requestId,
          visitorId: result.visitorId,
        });
      } catch (err) {
        // Failing silently on fingerprint errors is intentional — we don't
        // want to break the app if the FP CDN is blocked.
        captureException(err, { tag: "fingerprint" });
      }
    })();
  }, [user]);
}
