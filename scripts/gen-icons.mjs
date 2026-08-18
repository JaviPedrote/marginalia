/**
 * Genera los iconos PWA a partir de un SVG inline.
 * Uso: node scripts/gen-icons.mjs
 *
 * Se ejecuta a mano; los PNG resultantes se versionan en public/icons/.
 * No forma parte del build para no depender de sharp en producción.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BG = "#0f172a"; // slate-900
const MARGIN = "#f59e0b"; // amber-500
const TEXT = "#e2e8f0"; // slate-200

/**
 * @param {number} size
 * @param {number} pad Fracción de lienzo reservada como zona segura (maskable).
 */
function svg(size, pad) {
  const s = size;
  const inner = s * (1 - pad * 2);
  const x0 = s * pad;
  const y0 = s * pad;

  // Coordenadas relativas al cuadro interior
  const marginX = x0 + inner * 0.24;
  const lineX = x0 + inner * 0.38;
  const lineW = inner * 0.46;
  const lineH = inner * 0.075;
  const gap = inner * 0.155;
  const firstY = y0 + inner * 0.2;

  const textLines = [0, 1, 2, 3]
    .map((i) => {
      const w = i === 3 ? lineW * 0.55 : lineW;
      return `<rect x="${lineX}" y="${firstY + i * gap}" width="${w}" height="${lineH}" rx="${lineH / 2}" fill="${TEXT}" opacity="${i === 3 ? 0.55 : 0.9}"/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="${BG}"/>
  <rect x="${marginX}" y="${firstY - inner * 0.06}" width="${inner * 0.035}" height="${inner * 0.63}" rx="${inner * 0.0175}" fill="${MARGIN}"/>
  <path d="M ${marginX - inner * 0.13} ${firstY + inner * 0.12}
           q ${inner * 0.05} ${-inner * 0.09} ${inner * 0.09} 0
           q ${inner * 0.04} ${inner * 0.09} ${inner * 0.085} 0"
        fill="none" stroke="${MARGIN}" stroke-width="${inner * 0.032}" stroke-linecap="round"/>
  ${textLines}
</svg>`;
}

await mkdir("public/icons", { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, pad: 0.08 },
  { file: "icon-512.png", size: 512, pad: 0.08 },
  // Maskable: más zona segura, el sistema recorta hasta un 20% por lado.
  { file: "icon-192-maskable.png", size: 192, pad: 0.19 },
  { file: "icon-512-maskable.png", size: 512, pad: 0.19 },
  { file: "apple-touch-icon.png", size: 180, pad: 0.08 },
];

for (const { file, size, pad } of targets) {
  await sharp(Buffer.from(svg(size, pad)))
    .png({ compressionLevel: 9 })
    .toFile(`public/icons/${file}`);
  console.log(`✓ public/icons/${file} (${size}×${size})`);
}
