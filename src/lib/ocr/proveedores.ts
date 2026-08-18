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

  const texto =
    settings.ocr_provider === "claude"
      ? await conAnthropic({ settings, clave, base64 })
      : await conOpenAI({ settings, clave, base64 });

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
    throw new Error(
      `${settings.ocr_provider} ${res.status}: ${
        cuerpo?.error?.message ?? "respuesta ilegible"
      }`
    );
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
    throw new Error(`claude ${res.status}: ${cuerpo?.error?.message ?? "respuesta ilegible"}`);
  }
  if (cuerpo?.stop_reason === "refusal") {
    throw new Error(`el modelo declinó (${cuerpo?.stop_details?.category ?? "sin categoría"})`);
  }
  return (cuerpo?.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");
}
