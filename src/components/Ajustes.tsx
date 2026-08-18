"use client";

import { createClient } from "@/lib/supabase/client";
import { MODELOS_OCR, type Settings } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "./LogoutButton";

/**
 * Parametrización del OCR sin desplegar (§6 del plan v1.4).
 *
 * Lo que se puede cambiar aquí: proveedor, modelo, prompt y límites.
 * Lo que NO aparece ni aparecerá: las claves de API. Viven en variables de
 * entorno del servidor. Una clave en una pantalla que carga el navegador es
 * una clave publicada.
 */
export function Ajustes({ inicial }: { inicial: Settings }) {
  const [s, setS] = useState(inicial);
  const [estado, setEstado] = useState<"listo" | "guardando" | "guardado" | "error">("listo");

  // La opción elegida se identifica por modelo, que es lo único único.
  const seleccion =
    MODELOS_OCR.find((m) => m.model === s.ocr_model) ?? MODELOS_OCR[0];

  async function guardar() {
    setEstado("guardando");
    const supabase = createClient();
    const { error } = await supabase
      .from("settings")
      .update({
        ocr_provider: s.ocr_provider,
        ocr_model: s.ocr_model,
        ocr_base_url: s.ocr_base_url,
        ocr_prompt: s.ocr_prompt,
        ocr_max_tokens: s.ocr_max_tokens,
        ocr_daily_limit: s.ocr_daily_limit,
      })
      .eq("id", 1);
    setEstado(error ? "error" : "guardado");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 px-5 py-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <Link href="/" className="text-sm text-slate-500 underline underline-offset-4">
          Volver
        </Link>
      </header>

      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Modelo de transcripción
        <select
          value={seleccion.model}
          onChange={(e) => {
            const m = MODELOS_OCR.find((x) => x.model === e.target.value);
            if (!m) return;
            // Proveedor y URL base viajan con el modelo: elegirlos por separado
            // permite combinaciones imposibles (modelo de Kimi con URL de Claude).
            setS({
              ...s,
              ocr_model: m.model,
              ocr_provider: m.provider,
              ocr_base_url: m.baseUrl,
            });
            setEstado("listo");
          }}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
        >
          {MODELOS_OCR.map((m) => (
            <option key={m.model} value={m.model}>
              {m.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">
          Cada modelo necesita su clave en el servidor: `KIMI_API_KEY` para Kimi,
          `ANTHROPIC_API_KEY` para Claude. DeepSeek no aparece porque su API no
          acepta imágenes.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Tope de transcripciones por día y persona
        <input
          type="number"
          min={0}
          max={1000}
          value={s.ocr_daily_limit}
          onChange={(e) => {
            setS({ ...s, ocr_daily_limit: Number(e.target.value) });
            setEstado("listo");
          }}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
        />
        <span className="text-xs text-slate-500">
          Cuenta intentos, no aciertos: un bucle de fallos también gasta.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Instrucción de transcripción
        <textarea
          rows={9}
          value={s.ocr_prompt}
          onChange={(e) => {
            setS({ ...s, ocr_prompt: e.target.value });
            setEstado("listo");
          }}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-xs leading-relaxed text-slate-100"
        />
      </label>

      <button
        onClick={guardar}
        disabled={estado === "guardando"}
        className="rounded-xl bg-amber-600 py-3 font-semibold text-white active:bg-amber-700 disabled:opacity-50"
      >
        {estado === "guardando" ? "Guardando…" : "Guardar"}
      </button>

      {estado === "guardado" && (
        <p className="text-sm text-emerald-400">
          Guardado. Se aplica a la siguiente captura, sin desplegar.
        </p>
      )}
      {estado === "error" && <p className="text-sm text-red-400">No se pudo guardar.</p>}

      <LogoutButton />
    </main>
  );
}
