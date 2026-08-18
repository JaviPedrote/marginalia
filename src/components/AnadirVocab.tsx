"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

/**
 * Añadir una palabra al vocabulario desde la captura donde apareció (§2.4).
 *
 * Se hace aquí y no en una pantalla aparte porque el momento en que sabes que
 * no conocías una palabra es cuando estás leyendo la captura, no después.
 * Queda ligada al libro y a la captura, que es lo que la hace recordable.
 */
export function AnadirVocab({
  bookId,
  captureId,
}: {
  bookId: string;
  captureId: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [palabra, setPalabra] = useState("");
  const [significado, setSignificado] = useState("");
  const [estado, setEstado] = useState<"listo" | "guardando" | "guardado" | "duplicada" | "error">(
    "listo"
  );

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!palabra.trim()) return;

    setEstado("guardando");
    const supabase = createClient();
    const { data: sesion } = await supabase.auth.getUser();
    const userId = sesion.user?.id;
    if (!userId) {
      setEstado("error");
      return;
    }

    const { error } = await supabase.from("vocab").insert({
      user_id: userId,
      book_id: bookId,
      capture_id: captureId,
      word: palabra.trim(),
      meaning: significado.trim() || null,
    });

    if (error) {
      // 23505: el índice único parcial de la migración 004. No es un fallo que
      // haya que enseñar como error: la palabra ya está guardada de este libro.
      setEstado(error.code === "23505" ? "duplicada" : "error");
      return;
    }

    setPalabra("");
    setSignificado("");
    setEstado("guardado");
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="self-start text-sm text-slate-400 underline underline-offset-4"
      >
        + Añadir palabra al vocabulario
      </button>
    );
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-3 rounded-2xl border border-slate-800 p-4">
      <input
        autoFocus
        value={palabra}
        onChange={(e) => {
          setPalabra(e.target.value);
          setEstado("listo");
        }}
        placeholder="Palabra"
        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100"
      />
      <textarea
        rows={2}
        value={significado}
        onChange={(e) => {
          setSignificado(e.target.value);
          setEstado("listo");
        }}
        placeholder="Significado (opcional)"
        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100"
      />

      {estado === "guardado" && <p className="text-sm text-emerald-400">Añadida.</p>}
      {estado === "duplicada" && (
        <p className="text-sm text-amber-400">Ya la tenías guardada de este libro.</p>
      )}
      {estado === "error" && <p className="text-sm text-red-400">No se pudo guardar.</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={estado === "guardando" || !palabra.trim()}
          className="flex-1 rounded-xl bg-slate-700 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {estado === "guardando" ? "Guardando…" : "Añadir"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-xl border border-slate-700 px-4 text-sm text-slate-400"
        >
          Cerrar
        </button>
      </div>
    </form>
  );
}
