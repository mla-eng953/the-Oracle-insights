// Web Push handler. Registered alongside the workbox SW via importScripts
// in the generated SW; vite-plugin-pwa supports this via additionalManifestEntries.

self.addEventListener("push", (event) => {
  const data = (() => {
    try { return event.data ? event.data.json() : {}; } catch { return {}; }
  })();
  const title = data.title ?? "The Oracle";
  const body = data.body ?? "";
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: data.data ?? {},
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of list) {
      if (c.url === target) return c.focus();
    }
    return self.clients.openWindow(target);
  })());
});
