"use client";

import { useEffect, useState } from "react";

type Check = { label: string; ok: boolean; detail: string };

/**
 * Comprobación del paso 1 del §3: la PWA está instalada y el service worker
 * activo, verificado en el móvil real. Es la evidencia del DoD de §8, no una
 * feature: desaparece cuando la Fase 1 esté cerrada.
 */
export function InstallCheck() {
  const [checks, setChecks] = useState<Check[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // Safari en iOS no expone display-mode: standalone en todas las versiones.
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

      const supported = "serviceWorker" in navigator;
      const registration = supported
        ? await navigator.serviceWorker.getRegistration()
        : null;
      const swActive = Boolean(registration?.active);

      if (cancelled) return;

      setChecks([
        {
          label: "Abierta como app instalada",
          ok: standalone,
          detail: standalone
            ? "modo standalone"
            : "abierta en el navegador — instálala desde Compartir → Añadir a inicio",
        },
        {
          label: "Service worker",
          ok: swActive,
          detail: !supported
            ? "no soportado en este navegador"
            : swActive
              ? "activo"
              : "no registrado (solo se registra en producción)",
        },
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (checks === null) {
    return <p className="text-sm text-slate-500">⏳ Comprobando instalación…</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {checks.map((c) => (
        <li key={c.label} className="flex items-start gap-3 text-sm">
          <span aria-hidden className="mt-0.5">
            {c.ok ? "✅" : "⚠️"}
          </span>
          <span>
            <span className="text-slate-200">{c.label}</span>
            <span className="block text-xs text-slate-500">{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
