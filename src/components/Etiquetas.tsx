"use client";

import { useState } from "react";

/**
 * Editor de etiquetas de una captura.
 *
 * Normaliza a minúsculas y sin espacios extremos antes de guardar: sin eso,
 * «Filosofía», «filosofía» y «filosofía » serían tres etiquetas distintas y el
 * filtro de búsqueda se llenaría de duplicados que parecen la misma.
 */
export function Etiquetas({
  valor,
  onChange,
}: {
  valor: string[];
  onChange: (tags: string[]) => void;
}) {
  const [nueva, setNueva] = useState("");

  function añadir(e: React.FormEvent) {
    e.preventDefault();
    const t = nueva.trim().toLowerCase().replace(/\s+/g, " ");
    if (!t || valor.includes(t)) {
      setNueva("");
      return;
    }
    onChange([...valor, t]);
    setNueva("");
  }

  return (
    <div className="flex flex-col gap-2 text-sm text-slate-300">
      <span>Etiquetas</span>

      {valor.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {valor.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(valor.filter((x) => x !== t))}
              className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300"
            >
              {t} <span className="text-slate-500">✕</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={añadir} className="flex gap-2">
        <input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          placeholder="añadir etiqueta"
          autoCapitalize="none"
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl border border-slate-700 px-4 text-sm text-slate-300"
        >
          Añadir
        </button>
      </form>
    </div>
  );
}
