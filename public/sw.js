/**
 * Service worker de Marginalia (ADR-7).
 *
 * Objetivo: que la app sea instalable y arranque rápido desde el icono.
 * NO es una capa offline: la cola offline está en BACKLOG.md (§2 del plan) y
 * no entra en v1.0. Cachear de más aquí es la vía rápida a servir una versión
 * vieja de la app sin darse cuenta.
 *
 * Estrategias:
 *   /_next/static/*, /icons/*  → cache-first (URLs con hash, contenido inmutable)
 *   navegaciones (HTML)        → network-first con /offline como último recurso
 *   todo lo demás              → red directa, sin tocar la caché
 *
 * Nunca se intercepta: Supabase, /auth/*, /api/* ni nada que no sea GET.
 */

const VERSION = "v1";
const STATIC_CACHE = `marginalia-static-${VERSION}`;
const SHELL_CACHE = `marginalia-shell-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      // Activa esta versión sin esperar a que se cierren las pestañas viejas.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("marginalia-") && !k.endsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isPrecacheable(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Solo mismo origen. Supabase (Storage, Auth, PostgREST) va siempre a la red.
  if (url.origin !== self.location.origin) return;

  // Rutas con sesión o efectos: nunca se cachean.
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/api/")) return;

  if (isPrecacheable(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ??
            new Response("Sin conexión", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })()
    );
  }
});
