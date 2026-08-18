"use client";

import { useRef, useState } from "react";

export type Recorte = { x: number; y: number; w: number; h: number };

/**
 * Selector de la zona a transcribir: se arrastra un rectángulo sobre la foto.
 *
 * Está escrito a mano en lugar de usar una librería de recorte porque las
 * habituales están pensadas para encuadres con proporción fija y zoom (fotos de
 * perfil), y aquí el gesto es el contrario: marcar un párrafo suelto dentro de
 * una página, con cualquier proporción.
 *
 * Usa eventos de puntero, que cubren dedo y ratón con el mismo código, y
 * `touch-none` para que arrastrar seleccione en vez de hacer scroll de la
 * página — sin eso, en el móvil es imposible dibujar el rectángulo.
 *
 * El recorte se guarda en fracciones de 0 a 1, no en píxeles: la imagen se ve
 * escalada en pantalla y el original tiene otra resolución.
 */
export function Recortador({
  url,
  valor,
  onChange,
}: {
  url: string;
  valor: Recorte | null;
  onChange: (r: Recorte | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inicio, setInicio] = useState<{ x: number; y: number } | null>(null);

  function posicion(e: React.PointerEvent) {
    const caja = ref.current?.getBoundingClientRect();
    if (!caja) return null;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - caja.left) / caja.width)),
      y: Math.min(1, Math.max(0, (e.clientY - caja.top) / caja.height)),
    };
  }

  function rectangulo(a: { x: number; y: number }, b: { x: number; y: number }): Recorte {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x),
      h: Math.abs(b.y - a.y),
    };
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={ref}
        className="relative w-full touch-none overflow-hidden rounded-2xl border border-slate-800 select-none"
        onPointerDown={(e) => {
          const p = posicion(e);
          if (!p) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setInicio(p);
          onChange(null);
        }}
        onPointerMove={(e) => {
          if (!inicio) return;
          const p = posicion(e);
          if (p) onChange(rectangulo(inicio, p));
        }}
        onPointerUp={(e) => {
          const p = posicion(e);
          if (inicio && p) {
            const r = rectangulo(inicio, p);
            // Un toque suelto no es una selección: por debajo de este tamaño,
            // el recorte sería inservible y probablemente accidental.
            onChange(r.w > 0.05 && r.h > 0.02 ? r : null);
          }
          setInicio(null);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Foto capturada" className="pointer-events-none w-full" draggable={false} />

        {valor && (
          <>
            {/* Oscurecer lo que queda fuera hace evidente qué se va a transcribir */}
            <div className="pointer-events-none absolute inset-0 bg-slate-950/60" />
            <div
              className="pointer-events-none absolute border-2 border-amber-400"
              style={{
                left: `${valor.x * 100}%`,
                top: `${valor.y * 100}%`,
                width: `${valor.w * 100}%`,
                height: `${valor.h * 100}%`,
                boxShadow: "0 0 0 9999px rgba(2,6,23,0.0)",
                backgroundColor: "transparent",
                mixBlendMode: "normal",
              }}
            />
            <div
              className="pointer-events-none absolute overflow-hidden"
              style={{
                left: `${valor.x * 100}%`,
                top: `${valor.y * 100}%`,
                width: `${valor.w * 100}%`,
                height: `${valor.h * 100}%`,
              }}
            >
              {/* La misma imagen recolocada dentro del rectángulo: así la zona
                  elegida se ve nítida mientras el resto queda oscurecido. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{
                  width: `${100 / valor.w}%`,
                  left: `${(-valor.x / valor.w) * 100}%`,
                  top: `${(-valor.y / valor.h) * 100}%`,
                  height: `${100 / valor.h}%`,
                }}
              />
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {valor
          ? "Arrastra de nuevo para cambiar la zona."
          : "Arrastra sobre la foto para elegir qué transcribir. Sin selección, se transcribe entera."}
      </p>
    </div>
  );
}
