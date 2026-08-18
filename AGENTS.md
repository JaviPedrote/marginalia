<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Marginalia — reglas del proyecto

**Antes de tocar nada, leer el `plan.md`: el §0 (criterio de muerte) y la fase vigente.**
El plan es el contrato del proyecto; este fichero solo recoge lo operativo.

## Alcance

- El alcance está congelado en el **§2 del `plan.md`**. Cualquier idea que no esté ahí va a `BACKLOG.md` con fecha. La respuesta por defecto a una propuesta fuera de alcance es `BACKLOG.md`, no "buena idea, lo hacemos".
- Orden de un cambio de alcance: **`plan.md` (nueva versión con changelog) → `REQUIREMENTS.md` → código.** Nunca al revés.

## Invariantes que no se negocian

- **La captura nunca puede fallar.** El OCR sí. Un fallo de OCR deja la foto guardada y la nota intacta (ADR-3).
- **La captura no paga latencia de modelo.** El OCR es siempre asíncrono.
- **≤5 taps y ≤15 s** desde el móvil bloqueado hasta captura guardada (§7). Toda decisión de UI se mide contra esto.
- **RLS activo en todas las tablas** con `user_id = auth.uid()`, desde el día 1 (ADR-6).
- **La clave del OCR no sale del servidor.** Ni en un `NEXT_PUBLIC_`, ni en un comentario, ni en un fixture.
- **Borrado siempre lógico.** Toda consulta del producto filtra `deleted_at is null`.

## Parametrización (§6)

- Parámetros del OCR (proveedor, modelo, prompt, límites) → variables de entorno de la Edge Function.
- Parámetros del cliente (compresión, repaso) → `src/lib/config.ts`.
- No hay tabla `settings` y no debe añadirse sin pasar por el `plan.md`.
- Una constante de esas listas escrita a fuego dentro de un componente es un defecto.

## Estilo

- Español en UI, comentarios y mensajes de commit.
- Móvil primero. Nada pulsable por debajo de 44 px.
- Comentar el **porqué** de lo que sorprende, no el qué del código.
