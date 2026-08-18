/**
 * Validación del OCR — paso 2 del §3 del plan.
 *
 * Objetivo: saber si un modelo de visión transcribe con calidad suficiente
 * FOTOS REALES de páginas de libro en español, ANTES de construir el flujo de
 * captura encima. Si la calidad no llega, cambian el ADR-3 y el ADR-4.
 *
 * Dos decisiones que hacen la prueba honesta:
 *   · Las fotos se comprimen a los mismos límites que usará producción
 *     (1600 px, ADR-5) ANTES de enviarlas. Validar sobre el original de 12 MP
 *     mediría una calidad que la app nunca va a tener.
 *   · Se respeta la orientación EXIF. Una foto girada arruina la transcripción
 *     y es un fallo que se le atribuye al modelo por error.
 *
 * Mide tokens reales. Si defines el precio del modelo (ver PRECIOS), calcula
 * además el coste por 100 capturas, que es el dato que pide el §11 del plan.
 *
 * Uso:
 *   1. Deja 4-5 fotos (.jpg/.png) en spike/fotos/
 *   2. export KIMI_API_KEY=...        (o ANTHROPIC_API_KEY para el proveedor claude)
 *   3. node scripts/ocr-spike.mjs [modelo] [proveedor]
 *
 * Ejemplos:
 *   node scripts/ocr-spike.mjs                          → kimi-k2.6 en Kimi
 *   node scripts/ocr-spike.mjs kimi-k3
 *   node scripts/ocr-spike.mjs claude-opus-5 claude
 */
import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ENTRADA = "spike/fotos";
const SALIDA = "spike/salida";

// Mismos límites que src/lib/config.ts (ADR-5). Si allí cambian, aquí también.
const MAX_LADO = 1600;
const CALIDAD_JPEG = 80;

/**
 * Proveedores. Kimi y DeepSeek son compatibles con OpenAI, así que comparten
 * implementación; solo cambian la URL base y la variable de la clave.
 *
 * DeepSeek NO está aquí a propósito: su API pública no acepta imágenes
 * (verificado el 18/08/2026 contra su documentación). Sirve para texto, no
 * para OCR. Ver ADR-4 del plan.
 */
const PROVEEDORES = {
  kimi: {
    tipo: "openai",
    baseURL: process.env.KIMI_BASE_URL || "https://api.moonshot.ai/v1",
    claveEnv: "KIMI_API_KEY",
  },
  claude: {
    tipo: "anthropic",
    baseURL: "https://api.anthropic.com/v1",
    claveEnv: "ANTHROPIC_API_KEY",
  },
};

/**
 * Precios en dólares por millón de tokens, para calcular el coste.
 * Kimi no los publica en su documentación: cópialos de tu consola y
 * rellénalos aquí. Sin precio, el script informa de tokens y nada más.
 */
const PRECIOS = {
  "claude-opus-5": { entrada: 5, salida: 25 },
  "claude-haiku-4-5": { entrada: 1, salida: 5 },
  // "kimi-k2.6": { entrada: ?, salida: ? },
  // "kimi-k3":   { entrada: ?, salida: ? },
};

const MODELO = process.argv[2] ?? "kimi-k2.6";
const PROVEEDOR = process.argv[3] ?? (MODELO.startsWith("claude") ? "claude" : "kimi");

const PROMPT = `Transcribe literalmente el texto de esta página de libro.

Reglas:
- Devuelve SOLO el texto transcrito, sin comentarios ni introducción.
- Respeta los saltos de párrafo.
- Conserva tildes, eñes y comillas latinas (« ») tal como aparecen.
- Si hay anotaciones manuscritas al margen, transcríbelas al final precedidas de "[margen] ".
- Si un fragmento es ilegible, escribe [ilegible] en su lugar. No inventes texto.`;

/** Llamada a una API compatible con OpenAI (Kimi). */
async function transcribirOpenAI({ baseURL, clave, modelo, base64 }) {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${clave}`,
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });

  const cuerpo = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${cuerpo?.error?.message ?? JSON.stringify(cuerpo)}`);
  }
  return {
    texto: cuerpo.choices?.[0]?.message?.content ?? "",
    entrada: cuerpo.usage?.prompt_tokens ?? 0,
    salida: cuerpo.usage?.completion_tokens ?? 0,
  };
}

/** Llamada a la API de Anthropic. */
async function transcribirAnthropic({ baseURL, clave, modelo, base64 }) {
  const res = await fetch(`${baseURL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": clave,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 4000,
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
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });

  const cuerpo = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${cuerpo?.error?.message ?? JSON.stringify(cuerpo)}`);
  }
  if (cuerpo.stop_reason === "refusal") {
    throw new Error(`el modelo declinó (${cuerpo.stop_details?.category})`);
  }
  return {
    texto: (cuerpo.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n"),
    entrada: cuerpo.usage?.input_tokens ?? 0,
    salida: cuerpo.usage?.output_tokens ?? 0,
  };
}

async function main() {
  const proveedor = PROVEEDORES[PROVEEDOR];
  if (!proveedor) {
    console.error(
      `Proveedor desconocido: ${PROVEEDOR}\nDisponibles: ${Object.keys(PROVEEDORES).join(", ")}\n` +
        `(DeepSeek no está: su API no acepta imágenes — ver ADR-4)`
    );
    process.exit(1);
  }

  const clave = process.env[proveedor.claveEnv];
  if (!clave) {
    console.error(`Falta ${proveedor.claveEnv}.\n  export ${proveedor.claveEnv}=...`);
    process.exit(1);
  }

  let ficheros;
  try {
    ficheros = (await readdir(ENTRADA)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  } catch {
    console.error(`No existe la carpeta ${ENTRADA}/. Créala y deja ahí las fotos.`);
    process.exit(1);
  }
  if (ficheros.length === 0) {
    console.error(`No hay imágenes en ${ENTRADA}/`);
    process.exit(1);
  }

  await mkdir(SALIDA, { recursive: true });
  const transcribir = proveedor.tipo === "anthropic" ? transcribirAnthropic : transcribirOpenAI;

  console.log(`Proveedor: ${PROVEEDOR}  ·  Modelo: ${MODELO}`);
  console.log(`Imágenes:  ${ficheros.length}\n`);

  let totalEntrada = 0;
  let totalSalida = 0;
  let procesadas = 0;

  for (const fichero of ficheros) {
    const t0 = process.hrtime.bigint();

    // Compresión equivalente a la del cliente (ADR-5).
    const comprimida = await sharp(path.join(ENTRADA, fichero))
      .rotate() // respeta la orientación EXIF
      .resize({ width: MAX_LADO, height: MAX_LADO, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: CALIDAD_JPEG })
      .toBuffer();

    const kb = Math.round(comprimida.length / 1024);

    let r;
    try {
      r = await transcribir({
        baseURL: proveedor.baseURL,
        clave,
        modelo: MODELO,
        base64: comprimida.toString("base64"),
      });
    } catch (err) {
      console.log(`✗ ${fichero}: ${err.message}`);
      continue;
    }

    const segundos = Number(process.hrtime.bigint() - t0) / 1e9;
    totalEntrada += r.entrada;
    totalSalida += r.salida;
    procesadas++;

    await writeFile(path.join(SALIDA, `${path.parse(fichero).name}.txt`), r.texto, "utf8");

    console.log(
      `✓ ${fichero.padEnd(24)} ${String(kb).padStart(4)} KB  ` +
        `${String(r.entrada).padStart(6)} tok entrada  ${String(r.salida).padStart(5)} tok salida  ` +
        `${segundos.toFixed(1)}s  ${r.texto.length} caracteres`
    );
  }

  if (procesadas === 0) {
    console.error("\nNinguna imagen se procesó correctamente.");
    process.exit(1);
  }

  console.log("\n" + "─".repeat(70));
  console.log(`Tokens: ${totalEntrada} entrada / ${totalSalida} salida en ${procesadas} capturas`);
  console.log(`Media por captura: ${Math.round(totalEntrada / procesadas)} entrada / ${Math.round(totalSalida / procesadas)} salida`);

  const precio = PRECIOS[MODELO];
  if (precio) {
    const total = (totalEntrada / 1e6) * precio.entrada + (totalSalida / 1e6) * precio.salida;
    const porCaptura = total / procesadas;
    console.log(`Coste medido: $${total.toFixed(4)}  →  $${(porCaptura * 100).toFixed(2)} por 100 capturas   ← el dato del §11`);
  } else {
    console.log(
      `Sin precio configurado para ${MODELO}. Añádelo en PRECIOS (arriba en este\n` +
        `fichero) copiándolo de tu consola, y vuelve a lanzarlo para ver el coste.`
    );
  }
  console.log("─".repeat(70));
  console.log(`\nTranscripciones en ${SALIDA}/. Léelas comparándolas con las fotos:`);
  console.log("la decisión no es el coste, es si el texto sirve.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
