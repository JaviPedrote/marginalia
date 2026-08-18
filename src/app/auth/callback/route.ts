import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Ruta de respaldo para el enlace del email.
 *
 * El camino normal es el código de 6 dígitos (ver src/app/login/page.tsx), que
 * crea la sesión dentro de la PWA. Esta ruta cubre el caso de pulsar el enlace
 * del email: la sesión queda en el navegador del sistema, no en la PWA.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=sin_codigo", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=enlace_invalido", origin));
  }
  return NextResponse.redirect(new URL("/", origin));
}
