/**
 * Parámetros del cliente (§6 del plan).
 *
 * Regla: todo valor que pueda cambiar durante la vida del proyecto vive aquí,
 * no esparcido por los componentes. Los parámetros del OCR NO están en este
 * fichero: viven en variables de entorno de la Edge Function, porque cambiarlos
 * no debe requerir desplegar el cliente (y el prompt no debe viajar al navegador).
 *
 * La tabla `settings` con UI está diferida a BACKLOG.md hasta que exista un valor
 * concreto que la familia deba poder cambiar sin Javier.
 */

export const AUTH = {
  /**
   * Dominio de los emails internos (ADR-8). No existe como dominio real y no
   * se envía correo a él: solo convierte "javi" en un identificador con forma
   * de email, que es lo que Supabase Auth espera.
   *
   * Solo se aplica cuando el usuario escribe un nombre suelto. Quien escribe un
   * email real entra con él tal cual.
   */
  emailDomain: "marginalia.local",
} as const;

export const COMPRESSION = {
  /** Objetivo de tamaño tras comprimir (ADR-5). El DoD de §8 exige < 400 KB reales. */
  maxSizeMB: 0.3,
  /** Lado máximo en píxeles. Suficiente para que el OCR lea texto de libro. */
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  /** JPEG: mejor ratio que PNG para foto de página y suficiente para OCR. */
  fileType: "image/jpeg",
} as const;

export const STORAGE = {
  bucket: "captures",
} as const;

export const REVIEW = {
  /** Nº de elementos del repaso diario (Fase 3). Aún sin usar. */
  dailyItems: 10,
} as const;
