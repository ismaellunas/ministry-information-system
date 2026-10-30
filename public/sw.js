/* West MIS offline shell.
 * Navigations are network-first. A page opened while online can open again offline.
 * API responses are never cached. This worker must not delete IndexedDB.
 */
const CACHE = "west-mis-shell-v5";
const OFFLINE_PAGE = "/offline.html";
const SHELL_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="mobile-web-app-capable" content="yes"><title>West Section MIS</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f9fafb;color:#1e2939;font-family:Outfit,system-ui,sans-serif;padding:calc(2rem + env(safe-area-inset-top)) 1rem calc(2rem + env(safe-area-inset-bottom))}main{width:100%;max-width:24rem}h1{margin:0;font-size:18px;line-height:28px;font-weight:600;color:#101828}p{margin:1rem 0 0;font-size:14px;line-height:20px;color:#6a7282}a{display:flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:44px;margin-top:1rem;border-radius:10px;font-size:14px;font-weight:500;text-decoration:none}.primary{background:#465fff;color:#fff}.secondary{background:#fff;color:#344054;border:1px solid #d0d5dd}</style></head><body><main><h1>West MIS</h1><p>The calendar opens after this phone has loaded it once.</p><a class="primary" href="/calendar">Calendar</a><a class="secondary" href="/login">Sign in</a></main></body></html>`;

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
  await cache.addAll([OFFLINE_PAGE, "/manifest.webmanifest"]);
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
    const path = new URL(request.url).pathname;
    const section = path.startsWith("/calendar") ? "/calendar" : path.startsWith("/churches") ? "/churches" : null;
    if (section) {
      const exact = await cache.match(request, { ignoreSearch: true });
      const cachedSection = await cache.match(section, { ignoreSearch: true });
      return usablePage(exact) || usablePage(cachedSection) || (await cache.match(OFFLINE_PAGE)) || shellResponse();
    }
    const cachedCalendar = await cache.match("/calendar", { ignoreSearch: true });
    return usablePage(cachedCalendar) || (await cache.match(OFFLINE_PAGE)) || shellResponse();
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
    return cached || new Response("", { status: 204 });
  }
}

async function clearPages() {
  const cache = await caches.open(CACHE);
  const keys = await cache.keys();
  await Promise.all(
    keys.map((request) => {
      const path = new URL(request.url).pathname;
      const keep =
        path === "/offline.html" ||
        path === "/manifest.webmanifest" ||
        path.startsWith("/_next/") ||
        path.startsWith("/icons/");
      return keep ? undefined : cache.delete(request);
    })
  );
}

function usablePage(response) {
  if (!response || !response.ok) return null;
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return null;
  return response;
}

function shellResponse() {
  return new Response(SHELL_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
