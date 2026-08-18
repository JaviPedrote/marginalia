export const metadata = { title: "Sin conexión · Marginalia" };

/**
 * Último recurso del service worker cuando una navegación falla sin red.
 * No hay cola offline en v1.0 (está en BACKLOG.md): esta pantalla solo evita
 * el dinosaurio del navegador dentro de la PWA instalada.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-4xl">📵</p>
      <h1 className="text-xl font-semibold">Sin conexión</h1>
      <p className="text-sm text-slate-400">
        Marginalia necesita red para guardar capturas. Vuelve a intentarlo cuando tengas
        cobertura.
      </p>
    </main>
  );
}
