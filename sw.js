// Service worker minimal : ne s'occupe que de l'"app shell" (les fichiers
// statiques HTML/CSS/JS/icônes), jamais des données. Les données offline
// sont gérées séparément par IndexedDB (voir js/db.js).
const CACHE_NAME = "tc-shell-v6";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/css/style.css",
  "/js/app.js",
  "/js/db.js",
  "/js/supabaseClient.js",
  "/js/auth.js",
  "/js/sync.js",
  "/js/admin.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // On ne touche qu'aux requêtes GET vers notre propre origine (l'app shell).
  // Les appels vers Supabase (autre domaine) ou l'API Vercel /api/config
  // passent directement au réseau, sans interception ni mise en cache.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
