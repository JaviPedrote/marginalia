import type { Recorte } from "@/components/Recortador";

/**
 * Aplica el recorte en el navegador y devuelve el JPEG resultante.
 *
 * El recorte se hace ANTES de subir, así que a Storage solo llega la zona
 * elegida: la nota es exactamente lo que interesa y no se paga el giga del
 * plan gratuito por márgenes en blanco.
 *
 * Contrapartida asumida (v1.7 del plan): lo que queda fuera se pierde. Si el
 * recorte se queda corto, hay que volver a fotografiar la página. A cambio,
 * nunca hay dos versiones de la misma foto ni coordenadas que mantener.
 *
 * Se recorta sobre la resolución original y se comprime DESPUÉS: al revés,
 * recortar un cuarto de una imagen ya reducida a 1600 px dejaría un fragmento
 * de 400 px, demasiado pobre para transcribir.
 */
export async function recortarEnCliente(file: File, recorte: Recorte): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await cargarImagen(url);

    // naturalWidth/Height ya vienen con la orientación EXIF aplicada en los
    // navegadores actuales, igual que la vista previa del recortador. Las
    // fracciones se miden sobre esa misma imagen, así que coinciden.
    const anchoTotal = img.naturalWidth;
    const altoTotal = img.naturalHeight;

    const sx = Math.round(recorte.x * anchoTotal);
    const sy = Math.round(recorte.y * altoTotal);
    const sw = Math.max(1, Math.min(Math.round(recorte.w * anchoTotal), anchoTotal - sx));
    const sh = Math.max(1, Math.min(Math.round(recorte.h * altoTotal), altoTotal - sy));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("el navegador no permite recortar la imagen");

    // Fondo blanco: un JPEG no tiene transparencia y, sin esto, cualquier zona
    // sin pintar saldría negra.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sw, sh);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("no se pudo generar la imagen"))),
        "image/jpeg",
        0.92
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("no se pudo leer la foto"));
    img.src = url;
  });
}
