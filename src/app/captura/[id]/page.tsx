import { EditarCaptura } from "@/components/EditarCaptura";
import { createClient } from "@/lib/supabase/server";
import { STORAGE } from "@/lib/config";
import type { Book, Capture } from "@/lib/types";
import { notFound } from "next/navigation";

export const metadata = { title: "Captura · Marginalia" };

export default async function CapturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS hace el trabajo: si la captura no es de este usuario, no aparece.
  const { data: captura } = await supabase
    .from("captures")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<Capture>();

  if (!captura) notFound();

  const { data: libros } = await supabase
    .from("books")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // El bucket es privado: la imagen solo se sirve por URL firmada (§5).
  let urlImagen: string | null = null;
  if (captura.image_path) {
    const { data } = await supabase.storage
      .from(STORAGE.bucket)
      .createSignedUrl(captura.image_path, 60 * 60);
    urlImagen = data?.signedUrl ?? null;
  }

  return (
    <EditarCaptura
      captura={captura}
      libros={(libros ?? []) as Book[]}
      urlImagen={urlImagen}
    />
  );
}
