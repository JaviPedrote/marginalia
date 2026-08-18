"use client";

import { createClient } from "@/lib/supabase/client";
import { COMPRESSION, STORAGE } from "@/lib/config";
import type { Book, Capture } from "@/lib/types";
import imageCompression from "browser-image-compression";
import { useRef, useState } from "react";

type Estado =
  | { tipo: "listo" }
  | { tipo: "guardando" }
  | { tipo: "guardado"; captura: Capture; libro: string }
  | { tipo: "error"; mensaje: string };

/**
 * La home ES el botón de captura (§7 del plan).
 *
 * Reglas de §7 implementadas aquí, y por qué:
 *   · Guardado automático, sin confirmar. La cámara nativa ya obliga a un
 *     "Usar foto"; añadir un botón nuestro convertía los 5 taps del objetivo
 *     en 6. Se guarda solo y se ofrece Deshacer.
 *   · Libro pegajoso: la captura va al último libro usado. Caso común, 0 taps
 *     de asignación. Aquí es donde se le gana a Readwise.
 *   · La foto se sube ANTES de existir la fila, y la fila se crea con
 *     ocr_status='pending'. La UI confirma en cuanto la fila existe: no espera
 *     al modelo (ADR-3).
 */
export function Captura({
  libros,
  libroInicial,
  onGuardada,
}: {
  libros: Book[];
  libroInicial: Book | null;
  onGuardada: () => void;
}) {
  const [libro, setLibro] = useState<Book | null>(libroInicial);
  const [estado, setEstado] = useState<Estado>({ tipo: "listo" });
  const [creandoLibro, setCreandoLibro] = useState(false);
  const [tituloNuevo, setTituloNuevo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function capturar(file: File) {
    if (!libro) {
      setEstado({ tipo: "error", mensaje: "Crea un libro antes de capturar." });
      return;
    }
    setEstado({ tipo: "guardando" });

    const supabase = createClient();

    try {
      const { data: sesion } = await supabase.auth.getUser();
      const userId = sesion.user?.id;
      if (!userId) throw new Error("sesión caducada");

      // Compresión obligatoria (ADR-5): hace viable el giga del plan gratuito
      // y no le quita calidad al OCR.
      const comprimida = await imageCompression(file, {
        maxSizeMB: COMPRESSION.maxSizeMB,
        maxWidthOrHeight: COMPRESSION.maxWidthOrHeight,
        useWebWorker: COMPRESSION.useWebWorker,
        fileType: COMPRESSION.fileType,
      });

      const id = crypto.randomUUID();
      const ruta = `${userId}/${id}.jpg`;

      const { error: errSubida } = await supabase.storage
        .from(STORAGE.bucket)
        .upload(ruta, comprimida, { contentType: "image/jpeg", upsert: false });
      if (errSubida) throw new Error(`no se pudo subir la foto: ${errSubida.message}`);

      const { data: fila, error: errFila } = await supabase
        .from("captures")
        .insert({
          id,
          user_id: userId,
          book_id: libro.id,
          image_path: ruta,
          source: "photo",
          ocr_status: "pending",
        })
        .select()
        .single<Capture>();

      if (errFila) {
        // La foto ya está subida pero no hay fila que la referencie: se borra
        // para no dejar basura huérfana ocupando el giga.
        await supabase.storage.from(STORAGE.bucket).remove([ruta]);
        throw new Error(`no se pudo guardar la captura: ${errFila.message}`);
      }

      setEstado({ tipo: "guardado", captura: fila, libro: libro.title });
      onGuardada();

      // Disparo del OCR sin esperar respuesta (ADR-3): si el móvil se apaga
      // ahora, la fila se queda en 'pending' y el barrido la recoge. La foto
      // ya está guardada, que es lo único que no puede perderse.
      fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captureId: fila.id }),
        keepalive: true,
      }).catch(() => {
        /* el barrido lo recogerá */
      });
    } catch (err) {
      setEstado({
        tipo: "error",
        mensaje: err instanceof Error ? err.message : "error desconocido",
      });
    }
  }

  async function deshacer(captura: Capture) {
    const supabase = createClient();
    await supabase
      .from("captures")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", captura.id);
    if (captura.image_path) {
      await supabase.storage.from(STORAGE.bucket).remove([captura.image_path]);
    }
    setEstado({ tipo: "listo" });
    onGuardada();
  }

  async function crearLibro(e: React.FormEvent) {
    e.preventDefault();
    const titulo = tituloNuevo.trim();
    if (!titulo) return;

    const supabase = createClient();
    const { data: sesion } = await supabase.auth.getUser();
    const userId = sesion.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("books")
      .insert({ user_id: userId, title: titulo })
      .select()
      .single<Book>();

    if (!error && data) {
      setLibro(data);
      setTituloNuevo("");
      setCreandoLibro(false);
      onGuardada();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Libro pegajoso: se ve siempre, cambiarlo es 1 tap */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500">Libro</p>
          <p className="truncate text-slate-100">{libro?.title ?? "sin libro"}</p>
        </div>
        <button
          onClick={() => setCreandoLibro((v) => !v)}
          className="shrink-0 rounded-lg border border-slate-700 px-3 text-sm text-slate-300"
        >
          Cambiar
        </button>
      </div>

      {creandoLibro && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 p-4">
          {libros.length > 0 && (
            <select
              value={libro?.id ?? ""}
              onChange={(e) => {
                const elegido = libros.find((l) => l.id === e.target.value);
                if (elegido) {
                  setLibro(elegido);
                  setCreandoLibro(false);
                }
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100"
            >
              {libros.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          )}
          <form onSubmit={crearLibro} className="flex gap-2">
            <input
              value={tituloNuevo}
              onChange={(e) => setTituloNuevo(e.target.value)}
              placeholder="Título del libro nuevo"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-slate-700 px-4 text-sm font-medium text-white"
            >
              Crear
            </button>
          </form>
        </div>
      )}

      {/* EL botón. accept + capture abren la cámara trasera en 1 tap. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Se limpia el valor para que capturar dos veces la misma foto
          // vuelva a disparar el onChange.
          e.target.value = "";
          if (file) capturar(file);
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={estado.tipo === "guardando" || !libro}
        className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl bg-amber-600 text-lg font-semibold text-white active:bg-amber-700 disabled:opacity-40"
      >
        <span className="text-4xl" aria-hidden>
          📷
        </span>
        {estado.tipo === "guardando" ? "Guardando…" : "Capturar"}
      </button>

      {estado.tipo === "guardado" && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-800 bg-emerald-950/40 px-4 py-3">
          <p className="min-w-0 truncate text-sm text-emerald-200">
            Guardado en «{estado.libro}»
          </p>
          <button
            onClick={() => deshacer(estado.captura)}
            className="shrink-0 text-sm text-emerald-300 underline underline-offset-4"
          >
            Deshacer
          </button>
        </div>
      )}

      {estado.tipo === "error" && (
        <p className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {estado.mensaje}
        </p>
      )}
    </div>
  );
}
