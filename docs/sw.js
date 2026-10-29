const VERSION = "aegeanworks-shell-v16";
const SHELL_CACHE = VERSION;
const API_CACHE = "aegeanworks-api-v1";
const PRECACHE = [
  "./",
  "index.html",
  "project.html",
  "verify.html",
  "security.html",
  "privacy.html",
  "accessibility.html",
  "404.html",
  "offline.html",
  "styles.css",
  "app.js",
  "sw-client.js",
  "atlas.js",
  "atlas-core.js",
  "project.js",
  "project-core.js",
  "lightbox.js",
  "lightbox-core.js",
  "play.html",
  "live.html",
  "live.js",
  "live-core.js",
  "live-home.js",
  "live.json",
  "live/shots.json",
  "verify.js",
  "verify-core.js",
  "atlas-snapshot.json",
  "site.webmanifest",
  "favicon.svg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== SHELL_CACHE && key !== API_CACHE;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

async function offlineResponse() {
  const cached = await caches.match("offline.html");
  return cached || new Response("Offline", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

async function navigationFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone()).catch(function () {});
    }
    return response;
  } catch (error) {
    return (await caches.match(request, { ignoreSearch: true })) || offlineResponse();
  }
}

async function shellFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request).then(function (response) {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(function () {
    return cached || Response.error();
  });
  return cached || network;
}

// A versioned URL is the page's request for fresh code, so it must not be
// answered from an older shell cache. The unversioned precache remains the
// offline fallback.
async function versionedFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone()).catch(function () {});
    return response;
  } catch (error) {
    return (await cache.match(request, { ignoreSearch: true })) || Response.error();
  }
}

async function apiFirst(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || new Response(
      JSON.stringify({ message: "offline" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(navigationFirst(request));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(
      url.searchParams.has("v") || url.pathname.endsWith("/live.json")
        ? versionedFirst(request)
        : shellFirst(request)
    );
    return;
  }
  if (url.hostname === "api.github.com") {
    event.respondWith(apiFirst(request));
  }
});
