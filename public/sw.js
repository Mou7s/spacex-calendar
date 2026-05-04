const CACHE_NAME = "spacex-calendar-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/D-DIN.woff2",
  "/icon-512.png",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: Stale-While-Revalidate
  if (url.pathname === "/api/launches") {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            })
            .catch(() => cachedResponse); // Fallback to cache if network fails
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Static assets: Cache-First
  event.respondWith(
    caches.match(request).then((response) => {
      return (
        response ||
        fetch(request).then((networkResponse) => {
          // Cache newly discovered assets
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
      );
    })
  );
});
