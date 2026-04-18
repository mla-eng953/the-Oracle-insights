import { useEffect, useState, useCallback } from "react";
import { invokeFn } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { captureException } from "@/lib/telemetry";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function useNativePushBridge() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const handler = (event: MessageEvent) => {
      const data = event.data as { kind?: string; platform?: string; apnsToken?: string; bundleId?: string };
      if (data?.kind !== "oracle:push:token" || data.platform !== "ios" || !data.apnsToken) return;
      invokeFn("register-push-token", {
        platform: "ios",
        apnsToken: data.apnsToken,
        bundleId: data.bundleId,
      });
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [user]);
}

export function useWebPushSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<"unsupported" | "idle" | "granted" | "denied" | "subscribed">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "idle");
  }, []);

  const subscribe = useCallback(async () => {
    if (!user || !VAPID_PUBLIC_KEY) return;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("invalid subscription");
      await invokeFn("register-push-token", {
        platform: "web",
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setState("subscribed");
    } catch (err) {
      captureException(err, { tag: "webpush" });
    }
  }, [user]);

  return { state, subscribe };
}

function urlB64ToUint8Array(b64: string): Uint8Array {
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const b = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
