"use client";

import { useRef, useState } from "react";

export type Recorte = { x: number; y: number; w: number; h: number };

/** Tamaño mínimo del recorte, en fracción de lado. Por debajo no hay texto legible. */
const MINIMO = 0.06;

type Tirador = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "mover";

/**
 * Selector de la zona a transcribir: un marco que se ajusta arrastrando sus
 * bordes y esquinas, o se desplaza entero arrastrando por dentro.
 *
 * Sustituye a la versión de dibujar-rectángulo: con el dedo, dibujar obliga a
 * acertar el trazo a la primera y a repetirlo entero si te pasas, mientras que
 * un marco ya puesto se corrige empujando el lado que sobra.
 *
 * Coordenadas en fracciones de 0 a 1, no en píxeles: la imagen se ve escalada
 * en pantalla y el recorte se aplica luego sobre la resolución original.
 *
 * `touch-none` es imprescindible: sin él, arrastrar hace scroll de la página en
 * lugar de mover el marco.
 */
export function Recortador({
  url,
  valor,
  onChange,
}: {
  url: string;
  valor: Recorte;
  onChange: (r: Recorte) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ tirador: Tirador; inicio: Recorte; px: number; py: number } | null>(
    null
  );
  const [activo, setActivo] = useState(false);

  function fraccion(e: React.PointerEvent) {
    const caja = ref.current?.getBoundingClientRect();
    if (!caja) return null;
    return {
      x: (e.clientX - caja.left) / caja.width,
      y: (e.clientY - caja.top) / caja.height,
    };
  }

  /**
   * Un único manejador para los nueve puntos de agarre: cuál se ha tocado se
   * lee del `data-tirador` del elemento. Con una fábrica de manejadores por
   * tirador, la ref se escribiría desde una función creada en el render.
   */
  function empezar(e: React.PointerEvent<HTMLDivElement>) {
    const tirador = e.currentTarget.dataset.tirador as Tirador | undefined;
    const p = fraccion(e);
    if (!tirador || !p) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrastre.current = { tirador, inicio: valor, px: p.x, py: p.y };
    setActivo(true);
  }

  function mover(e: React.PointerEvent) {
    const a = arrastre.current;
    if (!a) return;
    const p = fraccion(e);
    if (!p) return;

    const dx = p.x - a.px;
    const dy = p.y - a.py;
    const i = a.inicio;

    // Bordes actuales; cada tirador empuja solo los suyos.
    let izq = i.x;
    let arr = i.y;
    let der = i.x + i.w;
    let aba = i.y + i.h;

    if (a.tirador === "mover") {
      const nx = Math.min(Math.max(0, i.x + dx), 1 - i.w);
      const ny = Math.min(Math.max(0, i.y + dy), 1 - i.h);
      onChange({ x: nx, y: ny, w: i.w, h: i.h });
      return;
    }

    if (a.tirador.includes("w")) izq = Math.min(Math.max(0, i.x + dx), der - MINIMO);
    if (a.tirador.includes("e")) der = Math.max(Math.min(1, i.x + i.w + dx), izq + MINIMO);
    if (a.tirador.includes("n")) arr = Math.min(Math.max(0, i.y + dy), aba - MINIMO);
    if (a.tirador.includes("s")) aba = Math.max(Math.min(1, i.y + i.h + dy), arr + MINIMO);

    onChange({ x: izq, y: arr, w: der - izq, h: aba - arr });
  }

  function soltar() {
    arrastre.current = null;
    setActivo(false);
  }

  const estilo = (t: Tirador): React.CSSProperties => {
    const centroX = `calc(${(valor.x + valor.w / 2) * 100}% - 14px)`;
    const centroY = `calc(${(valor.y + valor.h / 2) * 100}% - 14px)`;
    const izq = `calc(${valor.x * 100}% - 14px)`;
    const der = `calc(${(valor.x + valor.w) * 100}% - 14px)`;
    const arr = `calc(${valor.y * 100}% - 14px)`;
    const aba = `calc(${(valor.y + valor.h) * 100}% - 14px)`;
    const mapa: Record<Exclude<Tirador, "mover">, React.CSSProperties> = {
      nw: { left: izq, top: arr },
      n: { left: centroX, top: arr },
      ne: { left: der, top: arr },
      e: { left: der, top: centroY },
      se: { left: der, top: aba },
      s: { left: centroX, top: aba },
      sw: { left: izq, top: aba },
      w: { left: izq, top: centroY },
    };
    return mapa[t as Exclude<Tirador, "mover">];
  };

  const tiradores: Exclude<Tirador, "mover">[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={ref}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        className="relative w-full touch-none select-none overflow-hidden rounded-2xl border border-slate-800"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Foto capturada" className="pointer-events-none w-full" draggable={false} />

        {/* Lo de fuera se oscurece con cuatro bandas: es más simple y más rápido
            que recortar una máscara, y deja la zona elegida sin ningún filtro. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-slate-950/65" style={{ height: `${valor.y * 100}%` }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/65" style={{ height: `${(1 - valor.y - valor.h) * 100}%` }} />
        <div className="pointer-events-none absolute left-0 bg-slate-950/65" style={{ top: `${valor.y * 100}%`, height: `${valor.h * 100}%`, width: `${valor.x * 100}%` }} />
        <div className="pointer-events-none absolute right-0 bg-slate-950/65" style={{ top: `${valor.y * 100}%`, height: `${valor.h * 100}%`, width: `${(1 - valor.x - valor.w) * 100}%` }} />

        {/* Zona interior: arrastrar aquí desplaza el marco entero */}
        <div
          data-tirador="mover"
          onPointerDown={empezar}
          className="absolute cursor-move border-2 border-amber-400"
          style={{
            left: `${valor.x * 100}%`,
            top: `${valor.y * 100}%`,
            width: `${valor.w * 100}%`,
            height: `${valor.h * 100}%`,
          }}
        />

        {tiradores.map((t) => (
          <div
            key={t}
            data-tirador={t}
            onPointerDown={empezar}
            style={estilo(t)}
            // 28px de área táctil con un punto visible de 12px dentro: el dedo
            // necesita el área grande, la vista agradece el punto pequeño.
            className="absolute flex h-7 w-7 items-center justify-center"
          >
            <span className="block h-3 w-3 rounded-full border-2 border-slate-900 bg-amber-400" />
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        {activo
          ? "Suelta para fijar la zona."
          : "Ajusta el marco por los bordes. Solo se guarda y se transcribe lo que quede dentro."}
      </p>
    </div>
  );
}
