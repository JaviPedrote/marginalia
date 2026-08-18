import { createClient, getUserId } from "@/lib/supabase/server";
import { transcribir } from "@/lib/ocr/proveedores";
import type { Settings } from "@/lib/types";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy de OCR (ADR-3 y ADR-4 del plan).
 *
 * El plan hablaba de una Edge Function de Supabase; se implementa como API
 * route de Next porque hace exactamente lo mismo —la clave nunca sale del
 * servidor— y se despliega con la app en el mismo push, sin una segunda
 * herramienta ni una segunda sesión de CLI (plan v1.5).
 *
 * Controles de gasto obligatorios del ADR-4, en este orden:
 *   1. Sesión válida: sin JWT no se llama al modelo.
 *   2. Reclamación atómica pending → processing: dos llamadas concurrentes no
 *      pagan dos transcripciones de la misma foto.
 *   3. Tope diario por usuario, contando intentos y no éxitos: si contara
 *      éxitos, un bucle de fallos gastaría sin límite.
 *   4. max_tokens acotado desde `settings`.
 *
 * Nunca devuelve el texto al cliente: lo escribe en la fila. La UI se entera
 * por su propia consulta. Así el resultado sobrevive a que el móvil se apague
 * en mitad de la transcripción, que es el punto entero del ADR-3.
 */

// La transcripción de una foto puede tardar bastante más que una petición
// normal. Sin esto, Vercel corta a los 10 s por defecto.
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

  const { data: settings, error: errSettings } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single<Settings>();

  if (errSettings || !settings) {
    return NextResponse.json({ error: "sin_configuracion" }, { status: 500 });
  }

  // Tope diario (ADR-4). Se comprueba antes de reclamar para no gastar un
  // intento en una llamada que no se va a hacer.
  const { data: usadosHoy } = await supabase.rpc("ocr_hoy", { uid: userId });
  if (typeof usadosHoy === "number" && usadosHoy >= settings.ocr_daily_limit) {
    return NextResponse.json({ error: "tope_diario" }, { status: 429 });
  }

  // Reclamación atómica: solo una llamada consigue la fila. RLS garantiza
  // además que la captura sea de este usuario.
  const { data: capture, error: errClaim } = await supabase
    .from("captures")
    .update({ ocr_status: "processing" })
    .eq("id", captureId)
    .eq("ocr_status", "pending")
    .select("id, image_path, ocr_attempts")
    .maybeSingle();

  if (errClaim) {
    return NextResponse.json({ error: "error_bd" }, { status: 500 });
  }
  if (!capture) {
    // Ya la cogió otra llamada, o no está pendiente, o no es de este usuario.
    // No es un error: es la idempotencia funcionando.
    return NextResponse.json({ estado: "ya_reclamada" }, { status: 200 });
  }
  if (!capture.image_path) {
    await supabase
      .from("captures")
      .update({ ocr_status: "failed", ocr_error: "sin imagen" })
      .eq("id", captureId);
    return NextResponse.json({ error: "sin_imagen" }, { status: 400 });
  }

  const intentos = (capture.ocr_attempts ?? 0) + 1;

  try {
    const { data: fichero, error: errDescarga } = await supabase.storage
      .from("captures")
      .download(capture.image_path);

    if (errDescarga || !fichero) {
      throw new Error(`no se pudo leer la imagen: ${errDescarga?.message ?? "desconocido"}`);
    }

    const base64 = Buffer.from(await fichero.arrayBuffer()).toString("base64");
    const texto = await transcribir({ settings, base64 });

    await supabase
      .from("captures")
      .update({
        ocr_text: texto,
        ocr_status: "done",
        ocr_attempts: intentos,
        ocr_error: null,
      })
      .eq("id", captureId);

    return NextResponse.json({ estado: "ok" });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "error desconocido";

    // Vuelve a 'pending' para que el barrido lo reintente, salvo que ya se
    // hayan gastado tres intentos: a partir de ahí reintentar solo quema saldo.
    // La foto sigue guardada, que es lo que el ADR-3 protege.
    await supabase
      .from("captures")
      .update({
        ocr_status: intentos >= 3 ? "failed" : "pending",
        ocr_attempts: intentos,
        ocr_error: mensaje.slice(0, 500),
      })
      .eq("id", captureId);

    return NextResponse.json({ error: "ocr_fallido", detalle: mensaje }, { status: 502 });
  }
}
