"use client";

import { createClient } from "@/lib/supabase/client";
import type { Book, Capture } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import { Captura } from "./Captura";
import { EntradaManual } from "./EntradaManual";
import Link from "next/link";

type CapturaConLibro = Capture & { books: { title: string } | null };

const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
  pending: { texto: "transcribiendo…", clase: "text-amber-400" },
  processing: { texto: "transcribiendo…", clase: "text-amber-400" },
  done: { texto: "", clase: "" },
  failed: { texto: "sin transcribir", clase: "text-red-400" },
  skipped: { texto: "", clase: "" },
};

export function Home({
  librosIniciales,
  capturasIniciales,
}: {
  librosIniciales: Book[];
  capturasIniciales: CapturaConLibro[];
}) {
  const [libros, setLibros] = useState(librosIniciales);
  const [capturas, setCapturas] = useState(capturasIniciales);

  const recargar = useCallback(async () => {
    const supabase = createClient();
    const [{ data: l }, { data: c }] = await Promise.all([
      supabase.from("books").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase
        .from("captures")
        .select("*, books(title)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (l) setLibros(l as Book[]);
    if (c) setCapturas(c as CapturaConLibro[]);
  }, []);

  // El OCR llega en asíncrono (ADR-3): mientras haya capturas en curso, se
  // refresca solo. Cuando no queda ninguna, deja de consultar — un intervalo
  // eterno gasta batería y cuota por nada.
  const hayPendientes = capturas.some(
    (c) => c.ocr_status === "pending" || c.ocr_status === "processing"
  );
  useEffect(() => {
    if (!hayPendientes) return;
    const id = setInterval(recargar, 4000);
    return () => clearInterval(id);
  }, [hayPendientes, recargar]);

  // Barrido de huérfanas al abrir la app: recupera las transcripciones que se
  // quedaron colgadas porque el móvil se apagó o se fue la cobertura.
  useEffect(() => {
    fetch("/api/ocr/barrido", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.recuperadas > 0) recargar();
      })
      .catch(() => {
        /* se reintenta la próxima vez que se abra */
      });
  }, [recargar]);

  // Libro pegajoso: el de la última captura, o el último libro creado.
  const libroInicial =
    libros.find((l) => l.id === capturas[0]?.book_id) ?? libros[0] ?? null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 px-5 py-8">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">Marginalia</h1>
        <nav className="flex shrink-0 gap-3 text-sm text-slate-500">
          <Link href="/buscar" className="underline underline-offset-4">
            Buscar
          </Link>
          <Link href="/vocabulario" className="underline underline-offset-4">
            Vocabulario
          </Link>
          <Link href="/ajustes" className="underline underline-offset-4">
            Ajustes
          </Link>
        </nav>
      </header>

      <Captura libros={libros} libroInicial={libroInicial} onGuardada={recargar} />

      <EntradaManual libro={libroInicial} onGuardada={recargar} />

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Últimas capturas
        </h2>

        {capturas.length === 0 && (
          <p className="text-sm text-slate-500">
            Todavía no hay ninguna. El contador del criterio del §0 está a cero.
          </p>
        )}

        {capturas.map((c) => {
          const estado = ETIQUETA_ESTADO[c.ocr_status];
          return (
            <Link
              key={c.id}
              href={`/captura/${c.id}`}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 active:border-slate-600"
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-xs text-slate-400">
                  {c.books?.title ?? "sin libro"}
                  {c.page ? ` · p. ${c.page}` : ""}
                </span>
                {estado?.texto && (
                  <span className={`shrink-0 text-xs ${estado.clase}`}>{estado.texto}</span>
                )}
              </div>
              <p className="line-clamp-4 text-sm text-slate-200">
                {c.ocr_text?.trim() ||
                  c.note?.trim() ||
                  (c.ocr_status === "failed"
                    ? "La foto está guardada; la transcripción falló."
                    : "…")}
              </p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
