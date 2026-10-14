// Only the public offline message is cached. Private league data stays online.
const CACHE = "apex-offline-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add("/offline.html")),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("apex-offline-") && key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
    ]),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate" && event.request.method === "GET") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html")),
    );
  }
});
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    /* Always show a user-visible fallback. */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Apex League", {
      body: data.body || "Your league has a reminder for you.",
      icon: "/icon-192.png",
      tag: data.tag || "apex-reminder",
      data: { url: "/" },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const existing = windows.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );
        if (existing) return existing.focus();
        return self.clients.openWindow("/");
      }),
  );
});
