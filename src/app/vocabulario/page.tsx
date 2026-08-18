import { Vocabulario } from "@/components/Vocabulario";
import { createClient } from "@/lib/supabase/server";
import type { Vocab } from "@/lib/types";

export const metadata = { title: "Vocabulario · Marginalia" };

type VocabConLibro = Vocab & { books: { title: string } | null };

export default async function VocabularioPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("vocab")
    .select("*, books(title)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<VocabConLibro[]>();

  return <Vocabulario inicial={data ?? []} />;
}
