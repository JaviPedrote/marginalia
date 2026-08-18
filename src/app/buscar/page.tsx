import { Buscador } from "@/components/Buscador";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Buscar · Marginalia" };

/**
 * La búsqueda vive en su propia pantalla, no en la home.
 * El §7 es explícito: la home ES el botón de captura, no un dashboard. Una
 * caja de búsqueda arriba competiría con el único elemento que tiene que
 * ganar la pantalla.
 */
export default async function BuscarPage() {
  const supabase = await createClient();
  const { data: etiquetas } = await supabase.rpc("etiquetas_en_uso");

  return <Buscador etiquetas={(etiquetas ?? []) as { tag: string; usos: number }[]} />;
}
