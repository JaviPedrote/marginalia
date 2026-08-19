"use client";

import { createClient } from "@/lib/supabase/client";
import { COMPRESSION, STORAGE } from "@/lib/config";
import { recortarEnCliente } from "@/lib/recortar-cliente";
import type { Book, Capture } from "@/lib/types";
import imageCompression from "browser-image-compression";
import { useEffect, useRef, useState } from "react";
import { Recortador, type Recorte } from "./Recortador";

type Estado =
  | { tipo: "listo" }
  | { tipo: "recortando"; file: File; url: string }
  | { tipo: "guardando" }
  | { tipo: "guardado"; captura: Capture; libro: string }
  | { tipo: "error"; mensaje: string };

/** Marco inicial: casi toda la foto, con un margen para que se vean los tiradores. */
const RECORTE_INICIAL: Recorte = { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };

/**
 * La home ES el botón de captura (§7 del plan).
 *
 * Flujo: foto → elegir zona → guardar solo esa zona → el OCR llega solo.
 *
 * El recorte va ANTES de guardar (v1.7): a Storage solo llega lo que interesa,
 * la transcripción no se llena de texto irrelevante y no se pagan tokens por
 * los márgenes. Coste reconocido: guardar pasa de 5 a 6 taps, y el §7 llamaba
 * innegociables a esos 5. Se acepta a cambio de la calidad de la nota.
 *
 * Libro pegajoso: la captura va al último libro usado, 0 taps en el caso común.
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
  const [recorte, setRecorte] = useState<Recorte>(RECORTE_INICIAL);
  const [creandoLibro, setCreandoLibro] = useState(false);
  const [tituloNuevo, setTituloNuevo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Las URL de objeto ocupan memoria hasta que se liberan a mano; en un móvil,
  // varias fotos seguidas sin liberar acaban tirando la pestaña.
  useEffect(() => {
    if (estado.tipo !== "recortando") return;
    const url = estado.url;
    return () => URL.revokeObjectURL(url);
  }, [estado]);

  function elegirFoto(file: File) {
    if (!libro) {
      setEstado({ tipo: "error", mensaje: "Crea un libro antes de capturar." });
      return;
    }
    setRecorte(RECORTE_INICIAL);
    setEstado({ tipo: "recortando", file, url: URL.createObjectURL(file) });
  }

  async function guardar(file: File) {
    if (!libro) return;
    setEstado({ tipo: "guardando" });

    const supabase = createClient();

    try {
      const { data: sesion } = await supabase.auth.getUser();
      const userId = sesion.user?.id;
      if (!userId) throw new Error("sesión caducada");

      // Recortar primero sobre la resolución original y comprimir después: al
      // revés, un recorte pequeño de una imagen ya reducida sería ilegible.
      const recortada = await recortarEnCliente(file, recorte);
      const comprimida = await imageCompression(
        new File([recortada], "captura.jpg", { type: "image/jpeg" }),
        {
          maxSizeMB: COMPRESSION.maxSizeMB,
          maxWidthOrHeight: COMPRESSION.maxWidthOrHeight,
          useWebWorker: COMPRESSION.useWebWorker,
          fileType: COMPRESSION.fileType,
        }
      );

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
        // La foto está subida pero no hay fila que la referencie: se borra para
        // no dejar basura huérfana ocupando el giga del plan gratuito.
        await supabase.storage.from(STORAGE.bucket).remove([ruta]);
        throw new Error(`no se pudo guardar la captura: ${errFila.message}`);
      }

      setEstado({ tipo: "guardado", captura: fila, libro: libro.title });
      onGuardada();

      // Disparo del OCR sin esperar respuesta (ADR-3). Como la imagen ya es solo
      // la zona elegida, transcribir automáticamente vuelve a tener sentido: no
      // hay nada que descartar después. Si el móvil se apaga ahora, la fila se
      // queda 'pending' y el barrido la recoge.
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

  // Pantalla de recorte: ocupa el hueco del botón, no se superpone, para que
  // quede claro que la captura todavía no está guardada.
  if (estado.tipo === "recortando") {
    const { file, url } = estado;
    return (
      <div className="flex flex-col gap-3">
        <Recortador url={url} valor={recorte} onChange={setRecorte} />
        <div className="flex gap-2">
          <button
            onClick={() => guardar(file)}
            className="flex-1 rounded-xl bg-amber-600 py-3 font-semibold text-white active:bg-amber-700"
          >
            Guardar esta zona
          </button>
          <button
            onClick={() => setEstado({ tipo: "listo" })}
            className="rounded-xl border border-slate-700 px-4 text-sm text-slate-400"
          >
            Descartar
          </button>
        </div>
      </div>
    );
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
          // Se limpia el valor para que volver a elegir la misma foto dispare
          // otra vez el onChange.
          e.target.value = "";
          if (file) elegirFoto(file);
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
