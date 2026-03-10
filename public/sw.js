const CACHE_NAME = "kuku-post-v1";
const STATIC_ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/kuku-boy.png",
  "/kuku-green.png",
  "/kuku-pink.png",
  "/kuku-purple.png",
  "/kuku-blonde.png",
  "/kuku-white.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // API calls: network only
  if (request.url.includes("/api/")) return;

  // Static assets: cache first
  if (STATIC_ASSETS.some((a) => request.url.endsWith(a))) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Pages: network first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }
});
