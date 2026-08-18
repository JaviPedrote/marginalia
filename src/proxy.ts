import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";

/**
 * Proxy (lo que en Next ≤15 era middleware). Refresca la sesión de Supabase en
 * cada navegación y protege las rutas: sin sesión, todo va a /login.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getClaims valida el JWT localmente (rápido); solo va a la red como fallback.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const { pathname } = request.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/offline");

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  // Excluye estáticos, el manifest, el service worker y las rutas que validan
  // la sesión por su cuenta (/auth/callback intercambia el código, /api valida JWT).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|icons/|sw.js|manifest.webmanifest|auth/|api/).*)",
  ],
};
