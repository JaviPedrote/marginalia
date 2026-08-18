"use client";

import { createClient } from "@/lib/supabase/client";
import type { Vocab } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

type VocabConLibro = Vocab & { books: { title: string } | null };

/**
 * Listado del vocabulario (§2.4).
 *
 * Las palabras se añaden desde la captura donde aparecieron, no desde aquí:
 * el momento en que sabes que no conocías una palabra es leyendo, y así queda
 * ligada al libro y al pasaje. Esta pantalla es para repasar y corregir.
 */
export function Vocabulario({ inicial }: { inicial: VocabConLibro[] }) {
  const [palabras, setPalabras] = useState(inicial);
  const [filtro, setFiltro] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [significado, setSignificado] = useState("");

  const visibles = filtro.trim()
    ? palabras.filter((p) =>
        `${p.word} ${p.meaning ?? ""}`.toLowerCase().includes(filtro.trim().toLowerCase())
      )
    : palabras;

  async function guardarSignificado(id: string) {
    const supabase = createClient();
    await supabase
      .from("vocab")
      .update({ meaning: significado.trim() || null })
      .eq("id", id);
    setPalabras((ps) =>
      ps.map((p) => (p.id === id ? { ...p, meaning: significado.trim() || null } : p))
    );
    setEditando(null);
  }

  async function borrar(id: string) {
    const supabase = createClient();
    await supabase
      .from("vocab")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    setPalabras((ps) => ps.filter((p) => p.id !== id));
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-5 px-5 py-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Vocabulario</h1>
        <Link href="/" className="text-sm text-slate-500 underline underline-offset-4">
          Volver
        </Link>
      </header>

      {palabras.length === 0 ? (
        <p className="text-sm text-slate-500">
          Todavía no hay palabras. Se añaden desde una captura, con el botón
          «Añadir palabra al vocabulario».
        </p>
      ) : (
        <>
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar…"
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-500"
          />
          <p className="text-xs text-slate-500">
            {visibles.length} de {palabras.length}
          </p>
        </>
      )}

      <div className="flex flex-col gap-3">
        {visibles.map((p) => (
          <article
            key={p.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold text-slate-100">{p.word}</h2>
              <span className="shrink-0 truncate text-xs text-slate-500">
                {p.books?.title ?? ""}
              </span>
            </div>

            {editando === p.id ? (
              <div className="mt-2 flex flex-col gap-2">
                <textarea
                  autoFocus
                  rows={2}
                  value={significado}
                  onChange={(e) => setSignificado(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => guardarSignificado(p.id)}
                    className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-white"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditando(p.id);
                  setSignificado(p.meaning ?? "");
                }}
                className="mt-1 text-left text-sm text-slate-300"
              >
                {p.meaning || <span className="text-slate-600">sin significado — toca para añadirlo</span>}
              </button>
            )}

            <div className="mt-2 flex gap-4 text-xs">
              {p.capture_id && (
                <Link
                  href={`/captura/${p.capture_id}`}
                  className="text-slate-500 underline underline-offset-4"
                >
                  ver el pasaje
                </Link>
              )}
              <button onClick={() => borrar(p.id)} className="text-red-400/70">
                borrar
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
