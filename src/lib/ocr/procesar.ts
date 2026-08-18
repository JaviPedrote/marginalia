import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE } from "@/lib/config";
import { transcribir, ErrorTransitorio } from "./proveedores";
import type { Settings } from "@/lib/types";

/**
 * Transcribe una captura y escribe el resultado en su fila.
 *
 * Vive aquí, y no dentro de la ruta, porque lo usan dos entradas: el disparo
 * del cliente al guardar y el barrido de huérfanas. La alternativa —que el
 * barrido llamara por HTTP a la ruta de OCR— parece equivalente y no lo es:
 * en Vercel esa llamada interna tendría que ir a la URL del despliegue, que
 * está detrás del login de Vercel, y además obligaría a reenviar la cookie de
 * sesión a mano. Una función compartida no tiene ninguno de los dos problemas.
 *
 * Nunca devuelve el texto: lo escribe en la fila. La UI se entera por su propia
 * consulta, así que el resultado sobrevive a que el móvil se apague en mitad de
 * la transcripción — que es el punto entero del ADR-3.
 */

const MAX_INTENTOS = 3;

export type ResultadoOcr =
  | { estado: "ok" }
  | { estado: "ya_reclamada" }
  | { estado: "fallo"; mensaje: string };

export async function procesarCaptura({
  supabase,
  settings,
  captureId,
}: {
  supabase: SupabaseClient;
  settings: Settings;
  captureId: string;
}): Promise<ResultadoOcr> {
  // Reclamación atómica: solo una llamada consigue la fila. RLS garantiza
  // además que la captura sea de quien hace la petición.
  const { data: capture, error: errClaim } = await supabase
    .from("captures")
    .update({ ocr_status: "processing" })
    .eq("id", captureId)
    .eq("ocr_status", "pending")
    .select("id, image_path, ocr_attempts")
    .maybeSingle();

  if (errClaim) return { estado: "fallo", mensaje: errClaim.message };

  // Sin fila: ya la cogió otra llamada, o no está pendiente, o no es suya.
  // No es un error, es la idempotencia funcionando.
  if (!capture) return { estado: "ya_reclamada" };

  const intentos = (capture.ocr_attempts ?? 0) + 1;

  if (!capture.image_path) {
    await supabase
      .from("captures")
      .update({ ocr_status: "failed", ocr_attempts: intentos, ocr_error: "sin imagen" })
      .eq("id", captureId);
    return { estado: "fallo", mensaje: "sin imagen" };
  }

  try {
    const { data: fichero, error: errDescarga } = await supabase.storage
      .from(STORAGE.bucket)
      .download(capture.image_path);

    if (errDescarga || !fichero) {
      throw new Error(`no se pudo leer la imagen: ${errDescarga?.message ?? "desconocido"}`);
    }

    const base64 = Buffer.from(await fichero.arrayBuffer()).toString("base64");
    const texto = await transcribir({ settings, base64 });

    await supabase
      .from("captures")
      .update({ ocr_text: texto, ocr_status: "done", ocr_attempts: intentos, ocr_error: null })
      .eq("id", captureId);

    return { estado: "ok" };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "error desconocido";
    const transitorio = err instanceof ErrorTransitorio;

    // Un fallo transitorio NO gasta intento: el plan gratuito de Kimi admite una
    // sola petición simultánea, así que capturar dos páginas seguidas devuelve
    // un 429 que no dice nada sobre la foto. Contarlo como intento acababa
    // marcando 'failed' capturas perfectamente transcribibles.
    //
    // Vuelve a 'pending' para que el barrido lo reintente. La foto sigue
    // guardada, que es lo que el ADR-3 protege.
    await supabase
      .from("captures")
      .update({
        ocr_status: !transitorio && intentos >= MAX_INTENTOS ? "failed" : "pending",
        ocr_attempts: transitorio ? (capture.ocr_attempts ?? 0) : intentos,
        ocr_error: mensaje.slice(0, 500),
      })
      .eq("id", captureId);

    return { estado: "fallo", mensaje };
  }
}

/** Configuración del OCR. Falla ruidosamente: sin ella no hay nada que hacer. */
export async function cargarSettings(supabase: SupabaseClient): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single<Settings>();
  if (error || !data) {
    throw new Error("no hay fila de configuración; aplica la migración 002_settings.sql");
  }
  return data;
}

/** Cuántas transcripciones ha intentado hoy este usuario (tope del ADR-4). */
export async function intentosDeHoy(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase.rpc("ocr_hoy", { uid: userId });
  return typeof data === "number" ? data : 0;
}
