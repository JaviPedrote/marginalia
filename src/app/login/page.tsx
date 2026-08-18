"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Acceso por código de 6 dígitos enviado al email (OTP).
 *
 * Por qué código y no enlace mágico, pese a que §3 del plan dice "magic links":
 * un enlace del email abre en el navegador del sistema, y una PWA instalada
 * tiene su propio almacén de cookies separado del navegador (especialmente en
 * iOS). Resultado: pulsas el enlace, el navegador queda con sesión y la PWA
 * sigue pidiendo login. Con código, el email solo transporta 6 dígitos y la
 * sesión se crea dentro de la PWA, que es donde tiene que estar.
 *
 * Requiere que la plantilla "Magic Link" de Supabase incluya {{ .Token }}
 * (ver README, sección Configuración de Supabase).
 */
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // Fase 1: solo Javier. La familia se da de alta desde el panel de
        // Supabase en Fase 2 (ADR-6), no por autoservicio.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("signups not allowed")
          ? "Ese email no tiene cuenta todavía."
          : "No se pudo enviar el código. Inténtalo en unos minutos."
      );
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setError("Código incorrecto o caducado.");
      setLoading(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-center text-3xl font-bold">Marginalia</h1>
      <p className="mb-8 text-center text-sm text-slate-400">
        Notas de lectura de libros en papel
      </p>

      {step === "email" ? (
        <form onSubmit={requestCode} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoComplete="email"
              required
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-500"
              placeholder="tu@email.com"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-amber-600 py-3 font-semibold text-white active:bg-amber-700 disabled:opacity-50"
          >
            {loading ? "Enviando…" : "Enviarme un código"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-4">
          <p className="text-sm text-slate-400">
            Código enviado a <span className="text-slate-200">{email}</span>.
          </p>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Código de 6 dígitos
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-2xl tracking-[0.4em] text-slate-100 outline-none focus:border-amber-500"
              placeholder="000000"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="mt-2 rounded-xl bg-amber-600 py-3 font-semibold text-white active:bg-amber-700 disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="text-sm text-slate-400 underline underline-offset-4"
          >
            Usar otro email
          </button>
        </form>
      )}
    </main>
  );
}
