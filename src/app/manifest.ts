import type { MetadataRoute } from "next";

/**
 * Web App Manifest (ADR-7). Se sirve en /manifest.webmanifest.
 * `display: standalone` es lo que elimina la barra del navegador y hace que
 * el icono de la pantalla de inicio cuente como 1 tap en la métrica de §7.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marginalia",
    short_name: "Marginalia",
    description: "Notas de lectura de libros en papel.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "es-ES",
    dir: "ltr",
    categories: ["books", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
