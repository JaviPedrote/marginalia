/**
 * Validación del OCR — paso 2 del §3 del plan.
 *
 * Objetivo: saber si un modelo de visión transcribe con calidad suficiente
 * FOTOS REALES de páginas de libro en español, ANTES de construir el flujo de
 * captura encima. Si la calidad no llega, cambian el ADR-3 y el ADR-4, y es
 * mucho mejor saberlo ahora.
 *
 * Detalle que hace la prueba honesta: las fotos se comprimen a los mismos
 * límites que usará producción (ADR-5, src/lib/config.ts) ANTES de enviarlas.
 * Validar sobre el original de 12 MP mediría una calidad que la app no tendrá.
 *
 * Además mide el coste real por captura en vez de estimarlo, que es lo que
 * pide el §11 del plan para cerrar la decisión de proveedor.
 *
 * Uso:
 *   1. Deja 4-5 fotos (.jpg/.png) en spike/fotos/
 *   2. Exporta tu clave:  export ANTHROPIC_API_KEY=sk-ant-...
 *   3. node scripts/ocr-spike.mjs [modelo]
 *
 * Las transcripciones quedan en spike/salida/. Nada de spike/ se versiona.
 */
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ENTRADA = "spike/fotos";
const SALIDA = "spike/salida";

// Mismos límites que src/lib/config.ts (ADR-5). Si allí cambian, aquí también.
const MAX_LADO = 1600;
const CALIDAD_JPEG = 80;

// Precios en dólares por millón de tokens. Fuente: tarifas de la API de
// Anthropic. Se listan aquí para que el coste salga calculado, no estimado.
const PRECIOS = {
  "claude-opus-5": { entrada: 5, salida: 25 },
  "claude-sonnet-5": { entrada: 3, salida: 15 },
  "claude-haiku-4-5": { entrada: 1, salida: 5 },
};

const MODELO = process.argv[2] ?? "claude-opus-5";

const PROMPT = `Transcribe literalmente el texto de esta página de libro.

Reglas:
- Devuelve SOLO el texto transcrito, sin comentarios ni introducción.
- Respeta los saltos de párrafo.
- Conserva tildes, eñes y comillas latinas (« ») tal como aparecen.
- Si hay anotaciones manuscritas al margen, transcríbelas al final precedidas de "[margen] ".
- Si un fragmento es ilegible, escribe [ilegible] en su lugar. No inventes texto.`;

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "Falta ANTHROPIC_API_KEY.\n" + "  export ANTHROPIC_API_KEY=sk-ant-..."
    );
    process.exit(1);
  }
  if (!PRECIOS[MODELO]) {
    console.error(
      `Modelo desconocido: ${MODELO}\nDisponibles: ${Object.keys(PRECIOS).join(", ")}`
    );
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
  const client = new Anthropic();

  console.log(`Modelo: ${MODELO}`);
  console.log(`Imágenes: ${ficheros.length}\n`);

  let totalEntrada = 0;
  let totalSalida = 0;
  const filas = [];

  for (const fichero of ficheros) {
    const origen = path.join(ENTRADA, fichero);
    const t0 = process.hrtime.bigint();

    // Compresión equivalente a la del cliente (ADR-5).
    const comprimida = await sharp(origen)
      .rotate() // respeta la orientación EXIF; una foto girada arruina el OCR
      .resize({ width: MAX_LADO, height: MAX_LADO, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: CALIDAD_JPEG })
      .toBuffer();

    const kb = Math.round(comprimida.length / 1024);

    const respuesta = await client.messages.create({
      model: MODELO,
      max_tokens: 4000,
      // Transcribir no requiere razonamiento profundo: esfuerzo bajo mantiene
      // el coste y la latencia abajo sin tocar la calidad de lectura.
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: comprimida.toString("base64"),
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const segundos = Number(process.hrtime.bigint() - t0) / 1e9;

    if (respuesta.stop_reason === "refusal") {
      console.log(`✗ ${fichero}: el modelo declinó (${respuesta.stop_details?.category})`);
      continue;
    }

    const texto = respuesta.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const { input_tokens: ent, output_tokens: sal } = respuesta.usage;
    totalEntrada += ent;
    totalSalida += sal;

    await writeFile(path.join(SALIDA, `${path.parse(fichero).name}.txt`), texto, "utf8");

    filas.push({ fichero, kb, ent, sal, segundos: segundos.toFixed(1), chars: texto.length });
    console.log(
      `✓ ${fichero.padEnd(24)} ${String(kb).padStart(4)} KB  ` +
        `${String(ent).padStart(5)} tok entrada  ${String(sal).padStart(5)} tok salida  ` +
        `${segundos.toFixed(1)}s  ${texto.length} caracteres`
    );
  }

  if (filas.length === 0) {
    console.error("\nNinguna imagen se procesó correctamente.");
    process.exit(1);
  }

  const { entrada: pe, salida: ps } = PRECIOS[MODELO];
  const costeTotal = (totalEntrada / 1e6) * pe + (totalSalida / 1e6) * ps;
  const porCaptura = costeTotal / filas.length;

  console.log("\n" + "─".repeat(64));
  console.log(`Tokens:        ${totalEntrada} entrada / ${totalSalida} salida`);
  console.log(`Coste medido:  $${costeTotal.toFixed(4)} en ${filas.length} capturas`);
  console.log(`Por captura:   $${porCaptura.toFixed(5)}`);
  console.log(`Por 100:       $${(porCaptura * 100).toFixed(2)}   ← el dato que pide el §11`);
  console.log("─".repeat(64));
  console.log(`\nTranscripciones en ${SALIDA}/. Léelas comparándolas con las fotos:`);
  console.log("la decisión no es el coste, es si el texto sirve.");
}

main().catch((err) => {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("Clave de API inválida.");
  } else if (err instanceof Anthropic.RateLimitError) {
    console.error("Límite de peticiones alcanzado; reinténtalo en un minuto.");
  } else if (err instanceof Anthropic.APIError) {
    console.error(`Error de la API (${err.status}): ${err.message}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
