import sharp from "sharp";

/** Recorte en fracciones de 0 a 1 sobre cada lado. */
export type Recorte = { x: number; y: number; w: number; h: number };

/**
 * Aplica el recorte antes de enviar la imagen al modelo (migración 006).
 *
 * Se recorta aquí y no en el cliente para que la foto original siga intacta en
 * Storage: reencuadrar y volver a transcribir no necesita al móvil ni otra
 * subida, y un recorte mal hecho se rehace. Un recorte destructivo sería
 * permanente, que es justo lo que el ADR-3 evita con la foto.
 *
 * Las coordenadas son fracciones, no píxeles, así que el recorte hecho sobre
 * la imagen mostrada en pantalla sigue siendo válido sobre el original.
 */
export async function recortar(imagen: Buffer, recorte: Recorte | null): Promise<Buffer> {
  if (!recorte) return imagen;

  const img = sharp(imagen).rotate(); // aplica la orientación EXIF antes de medir
  const meta = await img.metadata();
  const ancho = meta.width;
  const alto = meta.height;

  // Sin dimensiones no se puede convertir fracciones a píxeles. Mejor mandar la
  // foto entera que fallar: el texto llega con ruido, pero llega.
  if (!ancho || !alto) return imagen;

  const left = Math.round(recorte.x * ancho);
  const top = Math.round(recorte.y * alto);
  // El redondeo puede sacar el rectángulo un píxel fuera del lienzo, y sharp
  // rechaza esa extracción con un error. Se acota al borde.
  const width = Math.max(1, Math.min(Math.round(recorte.w * ancho), ancho - left));
  const height = Math.max(1, Math.min(Math.round(recorte.h * alto), alto - top));

  return img.extract({ left, top, width, height }).jpeg({ quality: 85 }).toBuffer();
}
