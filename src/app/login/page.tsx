"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AUTH } from "@/lib/config";

/**
 * Acceso por usuario y contraseña (ADR-8 del plan).
 *
 * No hay email de por medio: el nombre de usuario se convierte en un email
 * interno `usuario@marginalia.local` que nunca se envía a ninguna parte.
 * Los usuarios se crean a mano en el panel de Supabase; no hay autoservicio.
 *
 * Por qué no magic links, que es lo que decía el plan hasta la v1.2: exigen que
 * Supabase mande correo, su emisor integrado no es apto para producción, y
 * montar SMTP propio para un login que ocurre una vez por dispositivo es
 * infraestructura desproporcionada para cuatro personas de la misma casa.
 */
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const email = `${username.trim().toLowerCase()}@${AUTH.emailDomain}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Mensaje único a propósito: no revelamos si el usuario existe.
      setError("Nombre o contraseña incorrectos");
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Nombre
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            required
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-500"
            placeholder="javi"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-500"
            placeholder="••••••••"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-amber-600 py-3 font-semibold text-white active:bg-amber-700 disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-slate-600">
        ¿Contraseña olvidada? Se cambia desde el panel de Supabase (ADR-8).
      </p>
    </main>
  );
}
