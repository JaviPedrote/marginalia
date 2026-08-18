import type { Settings } from "@/lib/types";

/**
 * Llamada al modelo de visión (ADR-4).
 *
 * Este módulo SOLO se importa desde el servidor: lee las claves de API de
 * variables de entorno sin prefijo NEXT_PUBLIC_, así que si alguien lo
 * importara desde un componente de cliente el build fallaría — que es
 * exactamente lo que queremos que pase.
 *
 * Proveedor, modelo, URL base y prompt llegan desde `settings` (§6): cambiarlos
 * no requiere desplegar. Las claves no: esas no salen del servidor jamás.
 */

const CLAVES: Record<Settings["ocr_provider"], string> = {
  kimi: "KIMI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
};

/**
 * Fallo que se resuelve solo esperando: límite de concurrencia, rate limit,
 * caída momentánea del proveedor.
 *
 * Distinguirlo importa porque el plan gratuito de Kimi admite **una sola
 * petición simultánea**: capturar dos páginas seguidas produce un 429 que no
 * es un error de la foto ni del modelo. Tratarlo como fallo definitivo gastaba
 * uno de los tres intentos y acababa marcando como 'failed' una captura
 * perfectamente transcribible.
 */
export class ErrorTransitorio extends Error {}

const REINTENTOS = 3;
const ESPERA_BASE_MS = 1500;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 429 = límite de peticiones o de concurrencia. 5xx = el proveedor, no nosotros. */
const esTransitorio = (status: number) => status === 429 || status >= 500;

export async function transcribir({
  settings,
  base64,
}: {
  settings: Settings;
  base64: string;
}): Promise<string> {
  const nombreClave = CLAVES[settings.ocr_provider];
  const clave = process.env[nombreClave];
  if (!clave) {
    throw new Error(`falta la variable de entorno ${nombreClave}`);
  }

  const llamar = () =>
    settings.ocr_provider === "claude"
      ? conAnthropic({ settings, clave, base64 })
      : conOpenAI({ settings, clave, base64 });

  // Reintento con espera creciente ante fallos transitorios. Kimi contesta
  // "please try again after 1 seconds" cuando ya hay otra transcripción en
  // curso; esperar aquí es más barato que devolver el trabajo a la cola.
  let texto = "";
  for (let intento = 1; ; intento++) {
    try {
      texto = await llamar();
      break;
    } catch (err) {
      if (!(err instanceof ErrorTransitorio) || intento >= REINTENTOS) throw err;
      await esperar(ESPERA_BASE_MS * intento);
    }
  }

  const limpio = texto.trim();
  if (!limpio) {
    // Una transcripción vacía es un fallo, no un resultado: si se guardara como
    // 'done', la captura quedaría marcada como transcrita y sin texto.
    throw new Error("el modelo devolvió una transcripción vacía");
  }
  return limpio;
}

/** Formato OpenAI — lo hablan Kimi y casi todos los proveedores. */
async function conOpenAI({
  settings,
  clave,
  base64,
}: {
  settings: Settings;
  clave: string;
  base64: string;
}): Promise<string> {
  const res = await fetch(`${settings.ocr_base_url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${clave}`,
    },
    body: JSON.stringify({
      model: settings.ocr_model,
      max_tokens: settings.ocr_max_tokens,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
            { type: "text", text: settings.ocr_prompt },
          ],
        },
      ],
    }),
  });

  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    const mensaje = `${settings.ocr_provider} ${res.status}: ${
      cuerpo?.error?.message ?? "respuesta ilegible"
    }`;
    throw esTransitorio(res.status) ? new ErrorTransitorio(mensaje) : new Error(mensaje);
  }
  return cuerpo?.choices?.[0]?.message?.content ?? "";
}

/** Formato Anthropic — opción de reserva. */
async function conAnthropic({
  settings,
  clave,
  base64,
}: {
  settings: Settings;
  clave: string;
  base64: string;
}): Promise<string> {
  const res = await fetch(`${settings.ocr_base_url}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": clave,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: settings.ocr_model,
      max_tokens: settings.ocr_max_tokens,
      // Transcribir no requiere razonamiento profundo.
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: base64 },
            },
            { type: "text", text: settings.ocr_prompt },
          ],
        },
      ],
    }),
  });

  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    const mensaje = `claude ${res.status}: ${cuerpo?.error?.message ?? "respuesta ilegible"}`;
    throw esTransitorio(res.status) ? new ErrorTransitorio(mensaje) : new Error(mensaje);
  }
  if (cuerpo?.stop_reason === "refusal") {
    throw new Error(`el modelo declinó (${cuerpo?.stop_details?.category ?? "sin categoría"})`);
  }
  return (cuerpo?.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");
}
