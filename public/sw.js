const CACHE_NAME = "spacex-calendar-v10";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/robots.txt",
  "/sitemap.xml",
  "/styles.css",
  "/app.js",
  "/i18n.js",
  "/locales/supported.json",
  "/locales/de.json",
  "/locales/en.json",
  "/locales/es.json",
  "/locales/fr.json",
  "/locales/ja.json",
  "/locales/ko.json",
  "/locales/zh-CN.json",
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

  // API calls: Network-first so completed launches do not linger on the homepage.
  if (url.pathname === "/api/launches") {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cache.match(request));
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
