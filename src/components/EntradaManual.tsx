"use client";

import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/lib/types";
import { useState } from "react";

/**
 * Entrada manual de texto (§2.2 del alcance).
 *
 * No pasa por OCR: nace con source='manual' y ocr_status='skipped', que es lo
 * que exige el CHECK de la migración 001. Sirve para lo que no es una página
 * fotografiable: una frase que recuerdas, una idea propia, una cita oída.
 */
export function EntradaManual({
  libro,
  onGuardada,
}: {
  libro: Book | null;
  onGuardada: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!libro || !texto.trim()) return;

    setGuardando(true);
    setError(null);
    const supabase = createClient();

    const { data: sesion } = await supabase.auth.getUser();
    const userId = sesion.user?.id;
    if (!userId) {
      setError("Sesión caducada.");
      setGuardando(false);
      return;
    }

    const { error: errFila } = await supabase.from("captures").insert({
      user_id: userId,
      book_id: libro.id,
      ocr_text: texto.trim(),
      source: "manual",
      ocr_status: "skipped",
    });

    setGuardando(false);
    if (errFila) {
      setError(errFila.message);
      return;
    }
    setTexto("");
    setAbierto(false);
    onGuardada();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        disabled={!libro}
        className="rounded-2xl border border-slate-700 py-3 text-sm text-slate-300 disabled:opacity-40"
      >
        ✍️ Escribir en vez de fotografiar
      </button>
    );
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-3 rounded-2xl border border-slate-800 p-4">
      <textarea
        autoFocus
        rows={5}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={`Texto para «${libro?.title ?? ""}»`}
        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 leading-relaxed text-slate-100"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={guardando || !texto.trim()}
          className="flex-1 rounded-xl bg-amber-600 py-3 font-semibold text-white disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setTexto("");
            setError(null);
          }}
          className="rounded-xl border border-slate-700 px-4 text-sm text-slate-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
