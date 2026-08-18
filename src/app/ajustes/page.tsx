import { Ajustes } from "@/components/Ajustes";
import { createClient } from "@/lib/supabase/server";
import type { Settings } from "@/lib/types";

export const metadata = { title: "Ajustes · Marginalia" };

export default async function AjustesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single<Settings>();

  if (!data) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
        <p className="text-sm text-red-400">
          No hay fila de configuración. Aplica la migración `002_settings.sql`.
        </p>
      </main>
    );
  }

  return <Ajustes inicial={data} />;
}
