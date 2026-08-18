import { InstallCheck } from "@/components/InstallCheck";
import { createClient, getUserId } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

/**
 * Home del esqueleto (paso 1 del §3).
 *
 * La home definitiva ES el botón de captura (§7). Esta pantalla es solo la
 * evidencia de que el andamiaje funciona antes de construir nada encima:
 * PWA instalada, sesión viva y base de datos accesible bajo RLS.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const userId = await getUserId(supabase);

  const { count, error } = await supabase
    .from("captures")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-3xl font-bold">Marginalia</h1>
        <p className="text-sm text-slate-400">Fase 1 · esqueleto verificable</p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Comprobaciones
        </h2>
        <ul className="mb-2 flex flex-col gap-2 text-sm">
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5">
              ✅
            </span>
            <span>
              <span className="text-slate-200">Sesión activa</span>
              <span className="block font-mono text-xs text-slate-500">{userId}</span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5">
              {error ? "⚠️" : "✅"}
            </span>
            <span>
              <span className="text-slate-200">Base de datos bajo RLS</span>
              <span className="block text-xs text-slate-500">
                {error
                  ? `error: ${error.message}`
                  : `${count ?? 0} capturas visibles para este usuario`}
              </span>
            </span>
          </li>
        </ul>
        <InstallCheck />
      </section>

      <section className="rounded-2xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">
        Aquí va el botón de captura (§7). No se construye hasta validar la calidad del
        OCR con fotos reales — paso 2 del §3.
      </section>

      <LogoutButton />
    </main>
  );
}
