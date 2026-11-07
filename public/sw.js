/* West MIS offline shell.
 * Navigations are network-first. A page opened while online can open again offline.
 * API responses are never cached. This worker must not delete IndexedDB.
 */
const CACHE = "west-mis-shell-v6";
const OFFLINE_PAGE = "/offline.html";
const OPEN_CALENDAR_SCRIPT = `document.getElementById("open-calendar").addEventListener("click",function(){caches.keys().then(function(keys){return keys.reduce(function(found,key){return found.then(function(hit){if(hit)return hit;return caches.open(key).then(function(cache){return cache.match("/calendar",{ignoreSearch:true});});});},Promise.resolve(null));}).then(function(hit){var type=hit&&hit.headers.get("content-type")||"";if(hit&&hit.ok&&type.indexOf("text/html")!==-1){location.assign("/calendar");return;}document.getElementById("note").textContent="This phone does not have the calendar yet. Open West MIS once while you are online, then it will open here.";});});`;
const SHELL_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="mobile-web-app-capable" content="yes"><title>West Section MIS</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f9fafb;color:#1e2939;font-family:Outfit,system-ui,sans-serif;padding:calc(2rem + env(safe-area-inset-top)) 1rem calc(2rem + env(safe-area-inset-bottom))}main{width:100%;max-width:24rem}h1{margin:0;font-size:18px;line-height:28px;font-weight:600;color:#101828}p{margin:1rem 0 0;font-size:14px;line-height:20px;color:#6a7282}button{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:100%;min-height:44px;margin-top:1rem;border:0;border-radius:10px;background:#465fff;color:#fff;font:inherit;font-size:14px;font-weight:500}</style></head><body><main><h1>West MIS</h1><p id="note">Open the calendar saved on this phone.</p><button type="button" id="open-calendar">Open calendar</button></main><script>${OPEN_CALENDAR_SCRIPT}</script></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheShell()
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(keepCachedPages().then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.jpeg" ||
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

async function keepCachedPages() {
  const cache = await caches.open(CACHE);
  const keys = await caches.keys();
  for (const key of keys) {
    if (key === CACHE) continue;
    const old = await caches.open(key);
    const requests = await old.keys();
    await Promise.all(
      requests.map(async (request) => {
        const path = new URL(request.url).pathname;
        const keep =
          path === "/calendar" ||
          path.startsWith("/calendar/") ||
          path.startsWith("/churches") ||
          path.startsWith("/_next/") ||
          path.startsWith("/icons/") ||
          path === "/favicon.jpeg";
        if (!keep) return;
        const response = await old.match(request);
        if (response) await cache.put(request, response);
      })
    );
    await caches.delete(key);
  }
}

async function precacheShell() {
  const cache = await caches.open(CACHE);
  await cache.addAll([OFFLINE_PAGE, "/manifest.webmanifest", "/favicon.jpeg"]);
}

async function cacheAssetsIn(cache, request) {
  const response = await cache.match(request);
  if (!response) return;
  const html = await response.clone().text();
  const paths = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
    const path = match[1];
    if (path.startsWith("/_next/") || path.startsWith("/icons/") || path === "/favicon.jpeg") paths.add(path);
  }
  await Promise.all(
    Array.from(paths).map((path) => cache.add(path).catch(() => undefined))
  );
}

async function networkFirstPage(event) {
  const request = event.request;
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && sameDocument(request, response) && response.body) {
      const path = new URL(request.url).pathname;
      const stored = response.clone();
      // Cache after returning so a streamed page can paint before the body ends.
      event.waitUntil(
        (async () => {
          await cache.put(request, stored);
          await cacheAssetsIn(cache, request);
          if (path !== "/calendar") await prefetchCalendar(cache);
        })()
      );
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

function sameDocument(request, response) {
  try {
    return new URL(response.url).pathname === new URL(request.url).pathname;
  } catch {
    return false;
  }
}

async function prefetchCalendar(cache) {
  const existing = await cache.match("/calendar", { ignoreSearch: true });
  if (usablePage(existing)) return;
  try {
    const response = await fetch(new Request("/calendar", { credentials: "same-origin" }));
    if (!response.ok || new URL(response.url).pathname !== "/calendar") return;
    await cache.put("/calendar", response.clone());
    await cacheAssetsIn(cache, new Request("/calendar"));
  } catch {
    // The next online page view tries again.
  }
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
