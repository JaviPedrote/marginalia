"use client";

import { useEffect } from "react";

/**
 * Registra el service worker (ADR-7).
 *
 * Solo en producción: en `next dev` los chunks de /_next/static cambian de
 * contenido conservando la URL, y cachearlos rompe el hot reload. La PWA se
 * verifica en la URL desplegada, que es además lo que exige el DoD de §8.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => {
        // Un fallo aquí degrada a web normal, no rompe la app (fallback de ADR-7).
        console.error("[sw] registro fallido:", err);
      });
  }, []);

  return null;
}
