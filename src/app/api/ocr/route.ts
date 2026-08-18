import { createClient, getUserId } from "@/lib/supabase/server";
import { cargarSettings, intentosDeHoy, procesarCaptura } from "@/lib/ocr/procesar";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy de OCR (ADR-3 y ADR-4 del plan).
 *
 * El plan hablaba de una Edge Function de Supabase; se implementa como API
 * route de Next porque hace exactamente lo mismo —la clave nunca sale del
 * servidor— y se despliega con la app en el mismo push (plan v1.5).
 *
 * Controles de gasto del ADR-4, en este orden:
 *   1. Sesión válida: sin JWT no se llama al modelo.
 *   2. Tope diario por usuario, antes de reclamar, para no gastar un intento
 *      en una llamada que no se va a hacer.
 *   3. Reclamación atómica y límite de reintentos, dentro de procesarCaptura.
 *   4. max_tokens acotado desde `settings`.
 */

// Una transcripción tarda más que una petición normal. Sin esto, Vercel corta
// a los 10 s por defecto.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: "sin_sesion" }, { status: 401 });
  }

  let captureId: string;
  try {
    ({ captureId } = await request.json());
    if (typeof captureId !== "string" || !captureId) throw new Error();
  } catch {
    return NextResponse.json({ error: "falta_capture_id" }, { status: 400 });
  }

  let settings;
  try {
    settings = await cargarSettings(supabase);
  } catch {
    return NextResponse.json({ error: "sin_configuracion" }, { status: 500 });
  }

  if ((await intentosDeHoy(supabase, userId)) >= settings.ocr_daily_limit) {
    return NextResponse.json({ error: "tope_diario" }, { status: 429 });
  }

  const resultado = await procesarCaptura({ supabase, settings, captureId });

  if (resultado.estado === "fallo") {
    return NextResponse.json(
      { error: "ocr_fallido", detalle: resultado.mensaje },
      { status: 502 }
    );
  }
  return NextResponse.json({ estado: resultado.estado });
}
