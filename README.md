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
3. Aplicar la migración. **Ojo con la cadena de conexión**: la conexión directa (`db.<ref>.supabase.co`) ya no resuelve en proyectos nuevos, Supabase solo la ofrece por IPv6. Hay que ir por el *pooler*, con usuario `postgres.<ref>` y la región correcta:

   ```bash
   npx supabase db push --db-url \
     "postgresql://postgres.<ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   ```

   La contraseña está en Project Settings → Database. La región aparece en la misma pantalla (este proyecto: `eu-central-1`).

   `supabase link` es la alternativa, pero requiere que la CLI tenga sesión en la cuenta dueña del proyecto; si usas la CLI con otra cuenta, `--db-url` evita cambiar de sesión.

   Si las políticas de `storage.objects` fallaran por permisos, pegar esa última sección de [`supabase/migrations/001_init.sql`](./supabase/migrations/001_init.sql) en el SQL Editor del panel.

4. **Desactivar la confirmación de email**: Authentication → Providers → Email → *Confirm email* en OFF. Sin esto, los usuarios creados a mano quedan en estado "sin confirmar" y no pueden entrar nunca, esperando un correo que nadie va a mandar.
5. **Cerrar el registro por autoservicio**: Authentication → Sign In / Providers → Email → *Allow new users to sign up* en OFF. La *publishable key* viaja en el bundle del navegador por diseño; con el registro abierto, cualquiera con la URL puede crear cuenta vía API y consumir la cuota del proyecto (RLS le impide ver datos ajenos, pero no entrar).
6. **Crear los usuarios a mano** en Authentication → Users → *Add user*, con contraseña y marcando *Auto Confirm User*. Email real para los adultos, `nombre@marginalia.local` para quien no tenga. En Fase 1, solo el de Javier.

### Operación: keep-alive y backup

Dos workflows de GitHub Actions, ambos diarios y lanzables a mano desde la pestaña *Actions*:

- **`keep-alive`** — consulta la base de datos para que el proyecto no se pause por inactividad.
- **`backup`** — `pg_dump` completo comprimido, guardado como artefacto de la ejecución.

Secretos que hay que dar de alta en *Settings → Secrets and variables → Actions*:

| Secreto | Valor |
|---|---|
| `SUPABASE_URL` | el mismo de `.env.local` |
| `SUPABASE_PUBLISHABLE_KEY` | el mismo de `.env.local` |
| `SUPABASE_DB_URL` | `postgresql://postgres.<ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres` |

**Qué NO cubre el backup:** solo vuelca la base de datos. **Las fotos del bucket `captures` no se copian.** Como el ADR-3 establece que "la foto ya es la nota", perder Storage equivale a perder las notas aunque la base de datos esté intacta. Pendiente de decidir si se cubre — ver `BACKLOG.md`.

**Dos limitaciones que conviene tener presentes:**

- GitHub **desactiva los workflows programados tras 60 días sin actividad en el repositorio**. Si el proyecto entra en reposo, el keep-alive se apaga solo y la pausa de Supabase llega igual. Hay que reactivarlo a mano desde *Actions*.
- Los artefactos caducan a los **90 días** (máximo de GitHub). Suficiente para la ventana de evaluación del §0; si el proyecto sigue vivo después, hay que darle un destino más duradero.

### Restaurar un backup

El DoD del §8 exige haberlo hecho **al menos una vez**: un backup sin restauración probada no es un backup.

```bash
# 1. Descargar el artefacto desde la pestaña Actions y descomprimirlo
gunzip marginalia-<fecha>.sql.gz

# 2. Restaurar sobre un proyecto de pruebas (NUNCA sobre el bueno)
psql "postgresql://postgres.<ref-de-pruebas>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
  -f marginalia-<fecha>.sql

# 3. Comprobar que los datos están
#    select count(*) from public.captures;
```

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `node scripts/gen-icons.mjs` | Regenera los iconos PWA en `public/icons/` |

---

## Decisiones que sorprenden al leer el código

**Login por usuario y contraseña, sin que se envíe correo en ningún flujo** (ADR-8). El identificador admite dos formas: un email real (adultos) o un nombre suelto, que se convierte en `nombre@marginalia.local` (hijos, que pueden no tener email). La regla es una línea: si lo escrito contiene `@`, se usa tal cual. Para Supabase Auth el email es solo un identificador.

Por qué no magic links, que es lo que decía el plan hasta la v1.2: exigen que Supabase mande correo, su emisor integrado está limitado a unos pocos correos por hora en todo el proyecto y su documentación lo declara no apto para producción. La alternativa era montar SMTP propio con dominio verificado — **infraestructura de correo para un login que ocurre una vez por dispositivo**, porque la sesión se refresca sola mientras se abra la app. Para cuatro personas de la misma casa, no sale a cuenta. Efecto colateral bueno: desaparece la entregabilidad de correo, que es la causa nº1 de "no puedo entrar" en apps familiares.

**Contrapartida:** no hay recuperación de contraseña por email. Se cambia desde el panel de Supabase, en 30 segundos.

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
    login/                Acceso por usuario y contraseña
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
