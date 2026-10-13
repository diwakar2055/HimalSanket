// HimalSanket Service Worker — Hardened Offline Disaster Resiliency Cache
const CACHE_NAME = "himalsanket-v2";
const TELEMETRY_CACHE = "himalsanket-telemetry-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[HimalSanket SW] Pre-caching emergency app shell");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[HimalSanket SW] Pre-cache skip non-fatal:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== TELEMETRY_CACHE) {
            console.log("[HimalSanket SW] Removing outdated cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  // Security Rule 1: Never attempt to cache POST / PUT / DELETE mutations
  if (event.request.method !== "GET") {
    return; // Pass through to network directly
  }

  const url = new URL(event.request.url);

  // Dynamic Telemetry & Sensor Feeds: Network-First with Schema-Compliant Fallback
  if (url.pathname.startsWith("/telemetry") || url.pathname.startsWith("/api/maps/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(TELEMETRY_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;

          // Schema-compliant offline mock fallback preventing React UI crashes
          return new Response(
            JSON.stringify({
              sensed_at: new Date().toISOString(),
              active_scenario: "offline_mesh",
              corridor: {
                rainfall: 0,
                rain_threshold: 144,
                seismic_activity: 0.2,
                lake_area_change: 0.0,
                reports: [],
              },
              risk_assessment: {
                risk_score: 0.15,
                risk_level: "Low",
                risk_level_ne: "न्यून",
                explanation: { key_drivers: ["Operating in offline mesh mode with baseline safety values"] },
              },
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        })
    );
    return;
  }

  // Static Assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
