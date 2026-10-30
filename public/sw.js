/* West MIS offline shell.
 * Navigations are network-first. A page opened while online can open again offline.
 * API responses are never cached. This worker must not delete IndexedDB.
 */
const CACHE = "west-mis-shell-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheShell()
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstPage(event.request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(staticAsset(event.request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "west-mis-clear-pages") return;
  event.waitUntil(clearPages());
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "west-mis-sync") return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) client.postMessage({ type: "west-mis-sync" });
    })
  );
});

async function precacheShell() {
  const cache = await caches.open(CACHE);
  await cache.addAll(["/offline", "/manifest.webmanifest"]);
  await cacheAssetsIn(cache, "/offline");
}

async function cacheAssetsIn(cache, request) {
  const response = await cache.match(request);
  if (!response) return;
  const html = await response.clone().text();
  const paths = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
    const path = match[1];
    if (path.startsWith("/_next/") || path.startsWith("/icons/")) paths.add(path);
  }
  await Promise.all(
    Array.from(paths).map((path) => cache.add(path).catch(() => undefined))
  );
}

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await cacheAssetsIn(cache, request);
    }
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("/offline")) || textOffline();
  }
}

async function staticAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const url = new URL(request.url);
  if (cached && url.pathname.startsWith("/_next/static/")) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return cached || new Response("", { status: 503, statusText: "Offline" });
  }
}

async function clearPages() {
  const cache = await caches.open(CACHE);
  const keys = await cache.keys();
  await Promise.all(
    keys.map((request) => {
      const path = new URL(request.url).pathname;
      const keep =
        path === "/offline" ||
        path === "/manifest.webmanifest" ||
        path.startsWith("/_next/") ||
        path.startsWith("/icons/");
      return keep ? undefined : cache.delete(request);
    })
  );
}

function textOffline() {
  return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
}
