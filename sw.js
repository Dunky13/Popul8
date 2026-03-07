const BASE_PATH = "/";
const CACHE_VERSION = "9877fc672636";
const BUILD_TIME = "2026-03-07T20:29:28.614Z";
const CACHE_NAME = `popul8-${CACHE_VERSION}`;
const APP_SHELL_ASSETS = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}branding/popul8-logo.svg`,
  // PWA icons — pre-cached so install/splash screens work fully offline
  `${BASE_PATH}favicon.ico`,
  `${BASE_PATH}favicon-16x16.png`,
  `${BASE_PATH}favicon-32x32.png`,
  `${BASE_PATH}favicon-48x48.png`,
  `${BASE_PATH}apple-touch-icon-180x180.png`,
  `${BASE_PATH}pwa-64x64.png`,
  `${BASE_PATH}pwa-192x192.png`,
  `${BASE_PATH}pwa-512x512.png`,
  `${BASE_PATH}maskable-icon-512x512.png`,
];
const SW_ASSET_MANIFEST = `${BASE_PATH}sw-assets.json`;

const isSameOriginRequest = (request) => {
  const requestUrl = new URL(request.url);
  return requestUrl.origin === self.location.origin;
};

const isStaticAsset = (request) => {
  const requestUrl = new URL(request.url);
  return (
    requestUrl.pathname.startsWith(`${BASE_PATH}assets/`) ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image"
  );
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      let assetsToCache = APP_SHELL_ASSETS;
      try {
        const manifestResponse = await fetch(SW_ASSET_MANIFEST, {
          cache: "no-store",
        });
        if (manifestResponse.ok) {
          const manifest = await manifestResponse.json();
          if (Array.isArray(manifest?.assets) && manifest.assets.length > 0) {
            assetsToCache = manifest.assets;
          }
        }
      } catch {
        // Fallback to app shell list when manifest is unavailable.
      }
      // Cache known shell entries without failing the install when one entry is unavailable.
      await Promise.allSettled(assetsToCache.map((asset) => cache.add(asset)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        }),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOriginRequest(request)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const isNavigation = request.mode === "navigate";

      if (isNavigation) {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return (
            (await cache.match(request)) ||
            (await cache.match(`${BASE_PATH}index.html`)) ||
            Response.error()
          );
        }
      }

      if (isStaticAsset(request)) {
        const cached = await cache.match(request);
        if (cached) return cached;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        return (await cache.match(request)) || Response.error();
      }
    })(),
  );
});
