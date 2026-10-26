const CACHE_VERSION = "vyorai-v2";
const STATIC_CACHE = `vyorai-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `vyorai-runtime-${CACHE_VERSION}`;

const MAX_RUNTIME_ITEMS = 60;

// Explicit allowlist of safe static assets to precache immediately
const PRECACHE_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/image.png",
  "/icons/icon-192.png",
  "/icons/icon-384.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
];

// Helper to trim caches to limit memory and disk usage
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}

// Install: precache offline fallback and essential icons
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: purge obsolete application-owned caches immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith("vyorai-") && name !== STATIC_CACHE && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Listen for skipWaiting messages from client / PwaManager
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch event
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1. Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  // 2. Cross-origin / Protocol check: Intercept only same-origin HTTP/HTTPS requests
  const url = new URL(request.url);
  if (!url.protocol.startsWith("http") || url.origin !== self.location.origin) {
    return;
  }

  // 3. NEVER cache /api/**, Next.js data chunks, auth flows, document downloads, or private files
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    url.pathname === "/login" ||
    url.pathname === "/setup-password"
  ) {
    return; // Pass through to network natively
  }

  // 4. Navigation requests (HTML documents)
  // Use Network-First strategy to ensure fresh authentication state and dynamic role views
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          // Network failed, serve the offline fallback page
          const cache = await caches.open(STATIC_CACHE);
          const cachedOffline = await cache.match("/offline.html");
          return cachedOffline || Response.error();
        })
    );
    return;
  }

  // 5. Next.js static immutable assets (_next/static/*)
  // Content-hashed assets: Cache-First is safe, fast, and resilient
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          // Only cache standard successful GET responses (status 200, basic type)
          if (response && response.status === 200 && response.type === "basic") {
            cache.put(request, response.clone());
            trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS).catch(() => {});
          }
          return response;
        } catch {
          return Response.error();
        }
      })
    );
    return;
  }

  // 6. Explicit allowlist of static public assets (icons, manifest, logo, offline page)
  const isAllowlistedStatic =
    url.pathname.startsWith("/icons/") ||
    PRECACHE_ASSETS.includes(url.pathname);

  if (isAllowlistedStatic) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response && response.status === 200 && response.type === "basic") {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return Response.error();
        }
      })
    );
    return;
  }
});
