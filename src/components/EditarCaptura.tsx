"use client";

import { createClient } from "@/lib/supabase/client";
import { STORAGE } from "@/lib/config";
import type { Book, Capture } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Edición de una captura (§7: página y nota son opcionales y se editan
 * DESPUÉS de guardar, nunca bloquean la captura).
 *
 * Esta pantalla es también lo que hace utilizable un OCR imperfecto: el texto
 * transcrito se corrige a mano. Sin ella, una transcripción con un error es
 * un error permanente.
 */
export function EditarCaptura({
  captura,
  libros,
  urlImagen,
}: {
  captura: Capture;
  libros: Book[];
  urlImagen: string | null;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(captura.ocr_text ?? "");
  const [nota, setNota] = useState(captura.note ?? "");
  const [pagina, setPagina] = useState(captura.page?.toString() ?? "");
  const [libroId, setLibroId] = useState(captura.book_id);
  const [estado, setEstado] = useState<"listo" | "guardando" | "guardado" | "error">("listo");
  const [reintentando, setReintentando] = useState(false);

  function tocado() {
    setEstado("listo");
  }

  async function guardar() {
    setEstado("guardando");
    const supabase = createClient();
    const paginaNum = pagina.trim() === "" ? null : Number(pagina);

    const { error } = await supabase
      .from("captures")
      .update({
        ocr_text: texto.trim() || null,
        note: nota.trim() || null,
        page: Number.isFinite(paginaNum) ? paginaNum : null,
        book_id: libroId,
      })
      .eq("id", captura.id);

    setEstado(error ? "error" : "guardado");
    if (!error) router.refresh();
  }

  async function reintentarOcr() {
    setReintentando(true);
    const supabase = createClient();

    // Devolver a 'pending' es lo que permite que la ruta de OCR la reclame:
    // su UPDATE condicional solo coge filas pendientes.
    await supabase
      .from("captures")
      .update({ ocr_status: "pending", ocr_attempts: 0, ocr_error: null })
      .eq("id", captura.id);

    await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captureId: captura.id }),
    });

    setReintentando(false);
    router.refresh();
  }

  async function borrar() {
    if (!confirm("¿Borrar esta captura?")) return;
    const supabase = createClient();
    // Borrado lógico: la fila se conserva y es recuperable desde el panel.
    await supabase
      .from("captures")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", captura.id);
    if (captura.image_path) {
      await supabase.storage.from(STORAGE.bucket).remove([captura.image_path]);
    }
    router.replace("/");
  }

  const enCurso = captura.ocr_status === "pending" || captura.ocr_status === "processing";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-5 px-5 py-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Captura</h1>
        <Link href="/" className="text-sm text-slate-500 underline underline-offset-4">
          Volver
        </Link>
      </header>

      {urlImagen && (
        /* next/image no encaja aquí: la URL viene firmada y caduca en una hora,
           así que no se puede declarar en remotePatterns, y optimizarla gastaría
           cuota de Vercel para una foto que solo mira su dueño. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlImagen}
          alt="Foto de la página capturada"
          className="w-full rounded-2xl border border-slate-800"
        />
      )}

      {enCurso && <p className="text-sm text-amber-400">Transcribiendo…</p>}

      {captura.ocr_status === "failed" && (
        <div className="rounded-2xl border border-red-900 bg-red-950/30 px-4 py-3">
          <p className="text-sm text-red-300">
            La transcripción falló. La foto está intacta: puedes reintentarlo o
            escribir el texto a mano.
          </p>
          {captura.ocr_error && (
            <p className="mt-1 font-mono text-xs text-red-400/70">{captura.ocr_error}</p>
          )}
          <button
            onClick={reintentarOcr}
            disabled={reintentando}
            className="mt-3 rounded-lg border border-red-800 px-3 py-2 text-sm text-red-200 disabled:opacity-50"
          >
            {reintentando ? "Reintentando…" : "Reintentar transcripción"}
          </button>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Texto
        <textarea
          rows={10}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            tocado();
          }}
          placeholder={enCurso ? "Llegará en unos segundos…" : "Escribe o corrige el texto"}
          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 leading-relaxed text-slate-100"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex w-24 flex-col gap-1 text-sm text-slate-300">
          Página
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={pagina}
            onChange={(e) => {
              setPagina(e.target.value);
              tocado();
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100"
          />
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-slate-300">
          Libro
          <select
            value={libroId}
            onChange={(e) => {
              setLibroId(e.target.value);
              tocado();
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100"
          >
            {libros.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Tu nota
        <textarea
          rows={3}
          value={nota}
          onChange={(e) => {
            setNota(e.target.value);
            tocado();
          }}
          placeholder="Por qué te interesó"
          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100"
        />
      </label>

      <button
        onClick={guardar}
        disabled={estado === "guardando"}
        className="rounded-xl bg-amber-600 py-3 font-semibold text-white active:bg-amber-700 disabled:opacity-50"
      >
        {estado === "guardando" ? "Guardando…" : "Guardar"}
      </button>

      {estado === "guardado" && <p className="text-sm text-emerald-400">Guardado.</p>}
      {estado === "error" && <p className="text-sm text-red-400">No se pudo guardar.</p>}

      <button
        onClick={borrar}
        className="mt-2 self-start text-sm text-red-400/80 underline underline-offset-4"
      >
        Borrar captura
      </button>
    </main>
  );
}
