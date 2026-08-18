import { Home } from "@/components/Home";
import { createClient } from "@/lib/supabase/server";
import type { Book } from "@/lib/types";

/**
 * La home ES el botón de captura (§7 del plan), no un dashboard.
 * Aquí solo se cargan los datos iniciales; el resto vive en el cliente porque
 * el OCR llega en asíncrono y la pantalla tiene que refrescarse sola.
 */
export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: libros }, { data: capturas }] = await Promise.all([
    supabase
      .from("books")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("captures")
      .select("*, books(title)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <Home
      librosIniciales={(libros ?? []) as Book[]}
      capturasIniciales={(capturas ?? []) as never}
    />
  );
}
