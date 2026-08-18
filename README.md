# Marginalia

> **Si el 15/09/2026 no hay ≥15 capturas repartidas en ≥3 libros, el proyecto se archiva y se adopta Readwise u Obsidian sin debate.**
>
> Reglas del criterio:
>
> - Los números se fijaron **antes del primer commit** y no se renegocian durante el periodo.
> - La evaluación es binaria y la hace el dato, no la sensación de progreso.
> - Archivar no es fracasar: el objetivo del experimento es averiguar si el hábito de captura existe. Lo único prohibido es el estado intermedio: proyecto a medias, sin uso y sin decisión.
> - Este bloque se copia literal al inicio del `README.md` del repo. Si desaparece de allí, el proyecto está fuera de contrato consigo mismo.

App personal/familiar para capturar y retener notas de lectura de libros en papel.
El plan completo —alcance, fases, decisiones de arquitectura, criterios— está en [`plan.md`](./plan.md). **Cada sesión de trabajo empieza leyendo el §0 y la fase vigente.**

Estado actual: **Fase 1, paso 1** (esqueleto + PWA). El flujo de captura todavía no existe.

---

## Puesta en marcha desde cero

```bash
git clone <repo> marginalia && cd marginalia
npm install
cp .env.example .env.local     # rellenar con los valores de Supabase
npm run dev                    # http://localhost:3000
```

### Configuración de Supabase (una vez)

1. Crear un proyecto en [supabase.com](https://supabase.com) (región Europa).
2. Copiar `Project URL` y la `publishable key` (Project Settings → API) a `.env.local`.
3. Aplicar la migración:

   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

   Si las políticas de `storage.objects` fallan por permisos, pegar esa última sección de [`supabase/migrations/001_init.sql`](./supabase/migrations/001_init.sql) en el SQL Editor del panel.

4. **Plantilla de email.** Authentication → Email Templates → *Magic Link*: añadir `{{ .Token }}` al cuerpo. Sin esto el login por código de 6 dígitos no funciona (ver más abajo por qué es código y no enlace).
5. **Crear el usuario de Javier** a mano en Authentication → Users. El registro por autoservicio está desactivado (`shouldCreateUser: false`): esto no es un producto con altas abiertas.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `node scripts/gen-icons.mjs` | Regenera los iconos PWA en `public/icons/` |

---

## Decisiones que sorprenden al leer el código

**Login por código de 6 dígitos, no por enlace mágico** — aunque el §3 del plan diga "magic links". Un enlace del email abre en el navegador del sistema, y una PWA instalada tiene su propio almacén de cookies, separado del navegador (en iOS de forma especialmente estricta). Pulsar el enlace deja la sesión en el navegador mientras la PWA sigue pidiendo login. Con código, el email solo transporta 6 dígitos y la sesión se crea dentro de la PWA. El enlace sigue funcionando como respaldo (`/auth/callback`).

**Pendiente para Fase 2 — el SMTP integrado de Supabase tiene un límite muy bajo de emails por hora** y está declarado como no apto para producción. Dar de alta a tres personas en una tarde lo va a tocar. Dos salidas, a decidir antes del onboarding familiar: configurar SMTP propio (Resend tiene plan gratuito suficiente) o pasar a usuario+contraseña como en `gym-tracker`, que elimina la dependencia del email. **Esta decisión debe registrarse en `plan.md` antes de implementarla.**

**El service worker solo se registra en producción.** En `next dev` los chunks de `/_next/static` cambian de contenido conservando la URL y cachearlos rompe el hot reload. La PWA se verifica en la URL desplegada, que es lo que exige el DoD del §8 de todas formas.

**El service worker casi no cachea.** No hay modo offline en v1.0 (está en `BACKLOG.md`). Solo cachea estáticos con hash y una pantalla `/offline`. Cachear de más es la vía rápida a servir una versión vieja de la app sin enterarse.

**`source` y `ocr_status` son columnas separadas.** El origen de la captura (foto / manual) no es un estado del OCR. Van juntas en muchos diseños y produce estados imposibles de consultar.

**Todo se borra en lógico (`deleted_at`).** Es un móvil: los taps falsos ocurren, y un backup no protege de un borrado intencionado mal dado. Toda consulta del producto filtra `deleted_at is null`.

---

## Estructura

```
src/
  app/
    page.tsx              Home. Hoy: panel de verificación del esqueleto.
                          Mañana: EL botón de captura (§7 del plan).
    login/                Acceso por código de 6 dígitos
    auth/callback/        Respaldo del enlace del email
    offline/              Pantalla del service worker sin red
    manifest.ts           Web App Manifest (/manifest.webmanifest)
  components/
  lib/
    config.ts             Parámetros del cliente (§6)
    supabase/             Clientes de navegador y servidor
  proxy.ts                Refresco de sesión y protección de rutas
public/
  sw.js                   Service worker
  icons/                  Iconos PWA (generados por scripts/gen-icons.mjs)
supabase/
  migrations/             Esquema y RLS
```
