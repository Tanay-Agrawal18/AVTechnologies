const CACHE_VERSION = "vyorai-v1";
const STATIC_CACHE = `vyorai-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `vyorai-runtime-${CACHE_VERSION}`;

// Assets to precache immediately
const PRECACHE_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
];

// Install: precache offline fallback and essential icons
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: purge older version caches
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

// Listen for skipWaiting messages from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch event
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Ignore chrome extensions or non-http protocols
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // 1. NEVER cache authenticated APIs, sensitive endpoints, or file downloads
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return; // Pass through to network natively
  }

  // 2. Navigation requests (HTML documents)
  // Use Network-First strategy to ensure fresh data and authentication state
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

  // 3. Next.js static immutable assets (_next/static/*)
  // These have content hashes, so Cache-First is safe and high-performance
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  // 4. Static icons and images in /icons/ or public images
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      })
    );
    return;
  }
});
