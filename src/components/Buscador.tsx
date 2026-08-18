"use client";

import { createClient } from "@/lib/supabase/client";
import type { Capture } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Resultado = Capture & { books: { title: string } | null };

/**
 * Búsqueda combinada, resuelta por la función `buscar_capturas` (migración 005).
 *
 * Por qué una función y no filtros aquí: la búsqueda necesita un OR entre
 * texto completo y subcadena sin acentos, porque el stemmer español falla en
 * dos casos muy comunes —«verdad» no encuentra «verdades», y «filosofia» sin
 * tilde no encuentra «filosofía»—. Expresar ese OR con la sintaxis de filtros
 * de PostgREST es frágil: la consulta del usuario puede llevar comas y
 * comillas, que ahí son separadores. Como parámetro de función no se parsea.
 */
export function Buscador({ etiquetas }: { etiquetas: { tag: string; usos: number }[] }) {
  const [texto, setTexto] = useState("");
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState(false);

  const buscar = useCallback(async () => {
    const consulta = texto.trim();
    if (!consulta && !etiqueta) {
      setResultados([]);
      setBuscado(false);
      return;
    }

    setBuscando(true);
    const supabase = createClient();

    const [{ data: crudas }, { data: libros }] = await Promise.all([
      supabase.rpc("buscar_capturas", { consulta: consulta || null, etiqueta }),
      supabase.from("books").select("id, title").is("deleted_at", null),
    ]);
    const filas = (crudas ?? []) as Capture[];

    // La función devuelve capturas sin el libro: PostgREST no puede embeber
    // relaciones en el resultado de un RPC. Se resuelve con un mapa, que a esta
    // escala es más barato que una consulta por fila.
    const titulos = new Map((libros ?? []).map((l) => [l.id, l.title]));

    setResultados(
      filas.map((c) => ({
        ...c,
        books: titulos.has(c.book_id) ? { title: titulos.get(c.book_id)! } : null,
      }))
    );
    setBuscando(false);
    setBuscado(true);
  }, [texto, etiqueta]);

  // Se busca al escribir, con una pausa: sin ella, cada tecla lanzaría una
  // consulta y la búsqueda iría a tirones en el móvil.
  useEffect(() => {
    const id = setTimeout(buscar, 300);
    return () => clearTimeout(id);
  }, [buscar]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-5 px-5 py-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Buscar</h1>
        <Link href="/" className="text-sm text-slate-500 underline underline-offset-4">
          Volver
        </Link>
      </header>

      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Una palabra del texto…"
        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-500"
      />

      {etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {etiquetas.map(({ tag, usos }) => (
            <button
              key={tag}
              onClick={() => setEtiqueta((actual) => (actual === tag ? null : tag))}
              className={`rounded-full border px-3 py-1 text-sm ${
                etiqueta === tag
                  ? "border-amber-500 bg-amber-950/50 text-amber-200"
                  : "border-slate-700 text-slate-400"
              }`}
            >
              {tag} <span className="text-xs opacity-60">{usos}</span>
            </button>
          ))}
        </div>
      )}

      {buscando && <p className="text-sm text-slate-500">Buscando…</p>}

      {!buscando && buscado && resultados.length === 0 && (
        <p className="text-sm text-slate-500">Nada coincide.</p>
      )}

      <div className="flex flex-col gap-3">
        {resultados.map((c) => (
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
            </div>
            <p className="line-clamp-4 text-sm text-slate-200">
              {c.ocr_text?.trim() || c.note?.trim() || "…"}
            </p>
            {c.tags.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">{c.tags.map((t) => `#${t}`).join(" ")}</p>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
