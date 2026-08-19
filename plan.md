# Marginalia — Plan de proyecto

> Nombre provisional. App personal/familiar para capturar y retener notas de lectura de libros en papel.
>
> **Versión 1.7 del plan — 19/08/2026.** Este documento congela alcance, fases y criterios. Los cambios de alcance se hacen editando este fichero (nueva versión con changelog en §12), nunca "de palabra" en una sesión de trabajo.
>
> Historial de cambios: ver §12. La v1.0 queda archivada en `plan-v1.0.backup.md`.

---

## 0. Criterio de muerte — leer antes que nada

> **Si el 15/09/2026 no hay ≥15 capturas repartidas en ≥3 libros, el proyecto se archiva y se adopta Readwise u Obsidian sin debate.**

Reglas del criterio:

- Los números se fijaron **antes del primer commit** y no se renegocian durante el periodo.
- La evaluación es binaria y la hace el dato, no la sensación de progreso.
- Archivar no es fracasar: el objetivo del experimento es averiguar si el hábito de captura existe. Lo único prohibido es el estado intermedio: proyecto a medias, sin uso y sin decisión.
- Este bloque se copia literal al inicio del `README.md` del repo. Si desaparece de allí, el proyecto está fuera de contrato consigo mismo.

**La consulta que decide (se ejecuta el 15/09 en el editor SQL de Supabase):**

```sql
select
  count(*)                         as capturas,        -- criterio: >= 15
  count(distinct book_id)          as libros,          -- criterio: >= 3
  count(distinct created_at::date) as dias_distintos,  -- INFORMATIVO
  count(distinct user_id)          as usuarios         -- INFORMATIVO
from captures
where deleted_at is null;
```

**Criterio = `capturas >= 15` AND `libros >= 3`. Nada más.**
`dias_distintos` y `usuarios` se muestran solo para leer el contexto (si el volumen viene de una sola tarde, o de una sola persona) y **no forman parte de la decisión**. Se decidió así deliberadamente el 18/08/2026; queda escrito aquí para que el 15/09 no haya nada que interpretar ni renegociar en ninguna de las dos direcciones.

---

## 1. Problema y usuarios

- **Problema:** las notas de lectura en papel viven en post-its dispersos; no hay centralización, búsqueda ni repaso. El competidor real no es otra app: es el post-it (fricción cero) y el olvido.
- **Usuarios:** Javier (Fase 1). Mujer e hijos (Fase 2; interés confirmado verbalmente — el dato definitivo será el uso real).
- **No-objetivos:** no es un producto comercial ni un clon completo de Readwise. Es una herramienta personal/familiar. Sin cuentas para terceros fuera del hogar en v1.x.

---

## 2. Alcance v1.0 (congelado)

**Dentro:**

1. Captura por foto con OCR asíncrono.
2. Entrada manual de texto.
3. Organización: libro, página, etiquetas, nota propia, búsqueda.
4. Vocabulario: palabra + significado, ligado a libro y captura.
5. Repaso diario con repetición espaciada y flashcards.
6. Exportación a Markdown (compatible con Obsidian).

*Nota de riesgo asumido (no es un cambio de alcance):* los puntos 4, 5 y 6 caen en el tramo 07/09–15/09, que a 2–4 h/semana son ~3–4 horas de trabajo efectivo. El alcance se mantiene por decisión explícita del 18/08/2026. **Punto de control neutral:** en la Puerta 1→2, con el ritmo real ya medido, se revisa si el tramo final se sostiene; si no, se recorta *entonces* con datos, no ahora con estimaciones.

**Fuera — muerto (no se aplaza):**

- Highlights populares/suplementarios: exigen datos agregados de miles de lectores; con N ≤ 4 usuarios la feature es estructuralmente vacía.

**Fuera — backlog (`BACKLOG.md`, nunca directo al build):**

- Estadísticas de lectura y repaso (una tarde, cuando haya datos que contar).
- Cola offline con IndexedDB (candidata a v1.1 solo si alguna vez se captura sin cobertura).
- ~~Tabla `settings` con UI de administración~~ — **readmitida en v1.4** (§6): ya existe el valor concreto que la justificaba, el proveedor y modelo del OCR. La pantalla de ajustes se construye *después* del flujo de captura.
- **Cualquier idea nueva a partir de hoy.** Regla: las ideas entran en `BACKLOG.md` con fecha; solo pasan al alcance editando esta sección en una nueva versión del plan.

---

## 3. Fases, puertas y calendario

**Regla de calendario: las fechas son indicativas, las puertas son vinculantes.** Cuando una fecha y una puerta chocan, gana la puerta. En v1.0 esto no estaba escrito y la Fase 2 arrancaba (24/08) un día después de terminar la Fase 1, lo que hacía imposible cumplir su propia puerta de entrada sin forzar el dato.

| Fase | Fechas (indicativas) | Contenido | Puerta de salida (vinculante) |
|---|---|---|---|
| **1 — Captura y supervivencia** | Fin de semana 22–23/08 | Foto→OCR asíncrono, entrada manual, libro pegajoso, nota/página opcionales. **Keep-alive y backup programado.** Solo cuenta de Javier activa (esquema multiusuario ya en BD). | DoD de §8 completo el domingo. |
| **Puerta 1→2** | — | Revisión del punto de control de §2 con ritmo real. | ≥10 capturas propias sin ningún fallo de captura (el OCR puede fallar; la captura, no). |
| **2 — Consulta y familia** | ~24/08 – 06/09 | Vocabulario, etiquetas, búsqueda. Onboarding de mujer e hijos con usuario y contraseña creados desde el panel (ADR-8). | Familia capturando sin asistencia. |
| **3 — Retención** | Desde ~07/09 | Repaso espaciado (Leitner simple) + flashcards, exportación Markdown. | Las tres features en uso al menos una vez cada una. |
| **Evaluación** | **15/09/2026** | Criterio de muerte de §0. | Continuar / archivar. |

**Por qué keep-alive y backup suben a Fase 1:** en v1.0 estaban en Fase 3 (07/09) mientras la familia entraba en Fase 2 (24/08). Eran **14 días de datos familiares sin copia de seguridad**, en un plan gratuito sin backups — en contradicción directa con lo que el propio documento decía querer evitar. Coste real de subirlos: un workflow de GitHub Actions con `cron`, un `select 1` y un `pg_dump` a repositorio privado. 30–45 minutos el sábado por la tarde.

**Presupuesto de tiempo:** Fase 1 = un fin de semana cerrado. Después, máximo 2–4 h/semana. Este proyecto no compite con OpenClaw ni con el roadmap Secure-Dev AI-Edge 2027: si compite, pierde él.

**Orden de trabajo del fin de semana (no negociable, el orden importa):**

1. **Sábado mañana, primero:** esqueleto vacío desplegado + PWA instalable verificada en el móvil real (ADR-7).
2. **Sábado mañana, segundo:** validación del OCR con 5 fotos reales de libros propios a través de la Edge Function, antes de construir listado ni edición (ADR-4). Si la calidad no sirve, quedan ~1,5 días para reaccionar en vez de ninguno.
3. **Sábado tarde:** flujo de captura completo + keep-alive + backup.
4. **Domingo:** entrada manual, RLS verificado, medición de la métrica de §7, DoD.

---

## 4. Decisiones de arquitectura (cerradas — formato ADR breve)

**ADR-1 · Frontend: Next 16 + React 19 + TypeScript + Tailwind 4, PWA.**
*Sustituye a la decisión de v1.0 (Vite + React SPA).* Motivo del cambio: es el stack que ya está rodado en `gym-tracker`, `mayeutica`, `fabrica-libros` y `adelante-camas`; no hay ningún proyecto propio con Vite. Con un presupuesto de **un fin de semana cerrado**, el andamiaje conocido vale más que la pureza arquitectónica. La app es client-side en la práctica; no se usa SSR salvo donde salga gratis.
*Contrapartida reconocida:* Next arrastra una capa de servidor innecesaria aquí y el service worker es algo más engorroso que con `vite-plugin-pwa`. Era un empate técnico real; lo desempata la experiencia previa.
**Despliegue:** Vercel (un comando) o Cloudflare con OpenNext copiando la configuración de `adelante-camas`. Se elige el sábado por la mañana, lo que arranque primero; no es una decisión estructural.

**ADR-2 · Backend: Supabase (Auth, Postgres, Storage, Edge Functions), free tier con mitigaciones.**
Límites conocidos y su mitigación: 1 GB de storage → compresión en cliente obligatoria (ADR-5); pausa tras inactividad → cron keep-alive (**Fase 1**); sin backups en el plan gratuito → `pg_dump` programado a repositorio privado (**Fase 1**). Los límites concretos del free tier se verifican en la documentación vigente el sábado, no se dan por supuestos desde este documento.

**ADR-3 · La captura se desacopla del OCR.**
Foto → compresión → subida a Storage + fila con `ocr_status='pending'` → la UI confirma al instante → el OCR ocurre en segundo plano y actualiza `ocr_text`. Motivo: la captura compite contra el post-it y no puede pagar la latencia del modelo. **Un fallo de OCR nunca pierde la nota: la foto ya es la nota.**

*Mecanismo de disparo — Fase 1:* el cliente, tras confirmar el guardado, hace un `fetch` *fire-and-forget* a la Edge Function; un cron cada 5 minutos recoge los `pending` huérfanos (cliente cerrado, red caída). Menos elegante que un Database Webhook, **mucho más depurable un sábado**: el webhook vía `pg_net` falla en silencio y es la pieza con más probabilidad de comerse horas. La migración a webhook es candidata de Fase 2, no requisito.

**ADR-4 · OCR: LLM de visión vía proxy en el servidor.**
*(v1.5: el proxy es una **API route de Next**, no una Edge Function de Supabase.)* Hace exactamente lo mismo —la clave nunca sale del servidor, se verifica el JWT— y se despliega con la app en el mismo push, sin una segunda herramienta, un segundo despliegue ni una segunda sesión de CLI. Motivo inmediato: la CLI de Supabase de esta máquina tiene sesión en otra cuenta y no puede desplegar funciones a este proyecto; motivo de fondo: una pieza móvil menos en un proyecto con presupuesto de un fin de semana. *Contrapartida:* la ruta hereda el límite de duración de Vercel (60 s), suficiente para una transcripción y, si no lo fuera, el diseño asíncrono del ADR-3 ya lo tolera: la fila se queda pendiente y el barrido la recoge.

La clave vive solo en el servidor, con allowlist y tope de gasto (misma postura de gateway que OpenClaw). Motivo: el OCR clásico sufre con la curvatura y sombras de una página fotografiada; un modelo de visión lo resuelve por céntimos y devuelve texto limpio en español. *Fallback:* Tesseract.js en cliente si algún día se quiere modo offline o coste cero.

**Proveedor y modelo son intercambiables en caliente** *(precisión de la v1.4)*. La transcripción se pide a través de una API compatible con OpenAI, que es el formato que hablan casi todos los proveedores; cambiar de uno a otro es cambiar URL base, modelo y clave, no código.

- **Kimi (Moonshot) es el proveedor de partida.** Motivo: es donde hay créditos ahora mismo. Modelos con visión verificados el 18/08/2026 en su documentación: `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.6`. API compatible con OpenAI, imagen como data URI en base64.
- **DeepSeek queda descartado para el OCR.** Su API pública **no acepta imágenes** (verificado el 18/08/2026: la documentación de la API solo documenta generación de texto, y la visión existe únicamente en su chat web y en un modelo de investigación). Sirve para texto, no para transcribir. Esto invalida la idea de alternar «barato/caro» entre Kimi y DeepSeek: **la elección barato/caro se hace entre modelos de Kimi**, y Claude queda como opción cara de reserva.
- **Las claves de API nunca son configurables desde la UI.** Viven en variables de entorno de la Edge Function y no se leen ni se escriben desde el navegador, pase lo que pase con el resto de la parametrización (§6).

*Controles de gasto obligatorios (el "tope del proveedor" suele ser un aviso, no un corte):*

- La Edge Function **verifica el JWT**: solo usuarios autenticados.
- **Rate limit por usuario** (arranque: 60 OCR/día).
- `max_tokens` acotado en la llamada.
- **Disparo idempotente:** un reintento no puede generar dos llamadas facturables para la misma captura.

*Validación de calidad:* se hace el **sábado por la mañana**, con 5 fotos reales de libros propios (letra pequeña, papel amarillento, sombra del móvil, español con tildes y comillas latinas), antes de construir listado y edición. Se decidió no hacer un spike previo al fin de semana; esta validación temprana es la mitigación de esa decisión.

**ADR-5 · Compresión en cliente obligatoria.**
`browser-image-compression`: objetivo ~300 KB, lado máximo 1600 px. Suficiente para OCR y hace viable el giga del free tier (~3.300 fotos).

**ADR-6 · Multiusuario desde el día 1, onboarding por puertas.**
RLS con `user_id = auth.uid()` en todas las tablas y política por carpeta en Storage. La familia entra en Fase 2, tras la Puerta 1→2: los usuarios familiares son de un solo intento y no se queman con una v0.1.

**ADR-7 · La PWA se monta primero, con la app vacía.** *(nuevo en v1.1)*
Ningún proyecto propio tiene PWA todavía: manifest, service worker e icono instalable son terreno nuevo y es la pieza con más riesgo de consumir el sábado. Se monta y se **verifica instalada en el móvil real** antes de escribir una sola feature. Si a mediodía del sábado la PWA no está instalada, se cae a "acceso web con acceso directo en la pantalla de inicio" y se sigue: la métrica de §7 es el objetivo, la PWA solo un medio.

**ADR-8 · Autenticación por usuario y contraseña, sin email. Altas manuales desde el panel.** *(nuevo en v1.2; sustituye a los magic links de la v1.0/v1.1)*
Login con contraseña y un identificador que admite dos formas *(precisión de la v1.3)*: un email real (adultos, que ya tienen uno y lo recuerdan) o un nombre suelto, que se convierte internamente en `nombre@marginalia.local` (hijos, que pueden no tener email). La regla es una línea: si lo escrito contiene `@`, se usa tal cual; si no, se le añade el dominio interno. Los usuarios se crean a mano en el panel de Supabase; no hay registro por autoservicio.

*Lo que no cambia con los emails reales:* **sigue sin enviarse correo en ningún flujo**. El email es solo un identificador. Que la dirección de un adulto exista de verdad es una puerta que queda abierta por si algún día se quiere recuperación de contraseña, no una dependencia que se contraiga hoy.

*Motivo del cambio.* Los magic links (y su variante de código de 6 dígitos) exigen que Supabase envíe correo. El emisor integrado de Supabase está limitado a unos pocos correos por hora en todo el proyecto y su documentación lo declara no apto para producción, así que la alternativa real era montar SMTP propio (Resend) con su dominio verificado. **Montar infraestructura de correo para un login que ocurre una vez por dispositivo es desproporcionado**: la sesión de Supabase se refresca sola mientras se abra la app, de modo que el alta es un evento único. Con cuatro usuarios en un mismo hogar, "gestionar contraseñas" consiste en decirlas en voz alta.

*Beneficio adicional no buscado:* elimina por completo la dependencia de entregabilidad de correo, que es la causa nº1 de "no puedo entrar" en apps familiares (spam, retrasos, filtros del operador).

*Contrapartida aceptada:* no hay recuperación de contraseña por email. Si alguien la olvida, se cambia desde el panel de Supabase en 30 segundos. Con N ≤ 4 usuarios convivientes esto es más barato que la alternativa.

*Consecuencia operativa:* la confirmación de email debe quedar desactivada en Supabase (Authentication → Providers → Email), o los usuarios creados a mano no podrán entrar nunca.

*Precedente:* es el mismo patrón ya en operación en `gym-tracker`.

---

## 5. Modelo de datos (Fase 1)

```sql
create table books (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id),
  title      text not null,
  author     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table captures (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id),
  book_id    uuid not null references books(id),
  image_path text,                      -- null en entradas manuales
  ocr_text   text,
  note       text,
  page       int,
  source     text not null
             check (source in ('photo','manual')),
  ocr_status text not null default 'pending'
             check (ocr_status in ('pending','done','failed','skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index on captures (user_id, created_at desc);
create index on captures (book_id);
create index on captures (ocr_status) where ocr_status = 'pending';

alter table books    enable row level security;
alter table captures enable row level security;
-- Políticas: user_id = auth.uid() para select / insert / update / delete.
```

**Cambios respecto a v1.0 y por qué:**

- **`status` se parte en `source` + `ocr_status`.** En v1.0, `'manual'` era un valor de `status` — pero *manual* no es un estado de OCR, es un origen. Mezclados, una captura manual no podía expresar ningún estado y "dame todo lo pendiente" tenía que excluir casos raros. Coste de separarlos ahora: cero. Coste de separarlos con datos dentro: una migración.
- **`deleted_at` (borrado lógico).** Es un móvil: los taps falsos ocurren. Sin esto, un mal toque borra una captura para siempre. Todas las consultas del producto filtran `deleted_at is null`.
- **`updated_at`.** Necesario para el export y para cualquier sincronización futura.
- **Índice parcial sobre `pending`.** Lo usa el cron barredor de ADR-3.

**Storage:** bucket privado `captures`, ruta `{user_id}/{capture_id}.jpg`, política que compara la primera carpeta del path con `auth.uid()`, lectura vía URLs firmadas.
**Retención de fotos:** se conservan siempre en v1.x (1 GB ÷ ~300 KB ≈ 3.300 fotos). Se revisa la política al superar el 70% de ocupación.

**Fases posteriores (se nombran, no se diseñan hoy):**

- `vocab` (palabra, significado, `book_id`, `capture_id` opcional) — Fase 2.
- **Búsqueda (Fase 2):** índice GIN sobre `to_tsvector('spanish', coalesce(ocr_text,'') || ' ' || coalesce(note,''))`. **El idioma es español y se fija ahora:** cambiarlo después es una migración con reindexado.
- `reviews` (caja Leitner 1–3, `next_due`) — Fase 3.

---

## 6. Parametrización

Lo que pueda cambiar durante la vida del proyecto no debe exigir tocar código disperso. Pero el mecanismo se elige por coste real, no por dogma:

**Variables de entorno de la Edge Function** (cambio = `supabase functions deploy`, ~30 s):

- Proveedor, modelo y prompt del OCR.
- Clave de API (nunca sale del servidor).
- Rate limit por usuario y `max_tokens`.

**Un único `config.ts` en el cliente** (cambio = un despliegue de la app):

- Límites de compresión (KB objetivo, píxeles máximos).
- Nº de elementos del repaso diario (Fase 3).

**Tabla `settings` + pantalla de ajustes — vuelve al alcance.** *(diferida en v1.1, readmitida en v1.4)*
La v1.1 la difirió por sobreingeniería, con la condición explícita de que entraría «cuando exista un valor concreto que haya que poder cambiar sin desplegar». Ese valor ya existe: **proveedor y modelo del OCR**, que se quieren poder alternar entre barato y caro sin tocar código. Contenido de la tabla:

- Proveedor, modelo y URL base del OCR.
- Prompt de transcripción.
- Límites: `max_tokens`, tope de OCR por usuario y día.

**Lo que nunca entra en `settings` ni en la UI: las claves de API.** Viven en variables de entorno de la Edge Function. Una clave en una tabla que el navegador puede leer es una clave publicada.

**Orden de construcción, no negociable:** la tabla y la lectura desde la Edge Function se hacen ya; **la pantalla de ajustes se construye después del flujo de captura**. El riesgo nº1 del §10 es que capturar sea más lento que un post-it, no que cambiar de modelo requiera un despliegue. Mientras no exista la pantalla, los valores se cambian con un `update` en el panel de Supabase, que cuesta lo mismo que un formulario y no consume el sábado.

**Eliminados — feature flags por fase.** *(eran requisito en v1.0)*
Con un solo usuario, "activar una fase sin ramas largas" ya tiene nombre: no desplegar todavía esa ruta. El flag añadía dos caminos de código y cero valor.

**Sigue siendo defecto:** cualquier valor de las dos primeras listas escrito a fuego en medio de un componente. Que no haya tabla `settings` no autoriza a esparcir constantes por el código.

---

## 7. Flujo de captura — especificación de la pantalla principal

- La home **es** el botón de captura (no un dashboard), con las últimas capturas debajo.
- `<input type="file" accept="image/*" capture="environment">` → cámara trasera nativa en 1 tap.
- **Libro pegajoso:** cada captura se asigna por defecto al último libro usado; cambiar de libro = 1 tap; crear libro = título y listo. Caso común: 0 taps de asignación. (Aquí es donde se gana a Readwise, cuyo flujo OCR exige asignar en cada captura.)
- **Guardado automático con deshacer** *(cambio respecto a v1.0)*: en cuanto el `input file` devuelve el fichero, **se guarda sin confirmación**. La UI muestra `Guardado en «[libro]»` con un botón *Deshacer / Editar* que permanece visible unos segundos.
  *Por qué:* la secuencia de v1.0 (desbloquear → icono → cámara → disparo → confirmar) daba 5, pero **olvidaba el «Usar foto» de la cámara nativa**, obligatorio en iOS y Android y fuera de nuestro control. El flujo real eran 6 y la métrica nacía incumplida. Eliminando la confirmación de la app: desbloquear → icono → cámara → disparo → usar foto = **5 taps, ninguno de ellos dentro de nuestra app**.
- **Se recorta antes de guardar** *(v1.7, sustituye al recorte posterior de la v1.6)*: tras el disparo aparece un marco ajustable por bordes y esquinas, y **solo la zona elegida se sube a Storage**. La transcripción vuelve a dispararse sola, porque la imagen guardada ya es exactamente lo que interesa.
  *Motivo:* fotografiar una página entera para quedarse con un párrafo llena la nota de texto irrelevante, paga tokens de sobra y consume el giga del plan gratuito con márgenes en blanco.
  *Coste reconocido:* **guardar pasa de 5 a 6 taps** y esta sección llamaba innegociables a esos 5. Se acepta a cambio de la calidad de la nota; queda escrito para que la métrica del DoD se mida contra 6, no contra 5, y para que la decisión no se olvide.
  *Contrapartida aceptada:* lo que queda fuera del marco se pierde. Un recorte corto obliga a volver a fotografiar la página. A cambio no hay dos versiones de la misma foto ni coordenadas que mantener.
- **La foto se muestra colapsada** en la pantalla de la captura una vez hay transcripción. Ya transcrita, la foto es el respaldo y el texto es el contenido; enseñar las dos cosas a la vez obliga a hacer scroll para llegar a lo único que se va a leer.
- Página y nota: opcionales, editables **después** de guardar, nunca bloqueantes.
- Estados visibles: `pending` (OCR en curso) → `done` (texto editable) / `failed` (la foto permanece; reintento manual).

**Métrica de éxito, medida en el móvil real:**

- **≤5 taps** desde el móvil bloqueado hasta captura guardada con libro asignado.
  *Definición para que no se pueda interpretar:* un "tap" es un toque intencionado sobre la pantalla. **El desbloqueo biométrico no cuenta**; el «Usar foto» de la cámara nativa **sí cuenta**.
- **≤15 s de reloj**, mediana de 3 intentos cronometrados. *(nueva)*
  *Por qué hace falta:* los taps pueden cumplirse y aun así perder contra el post-it, que son ~4 s. Y hay una asimetría que conviene tener presente: el post-it no exige desbloquear el móvil, ni cobertura, ni batería. Si la mediana supera los 15 s, el flujo se rediseña antes de invitar a nadie más.

---

## 8. Definition of Done — Fase 1 (domingo 23/08)

- [ ] Desplegada en URL pública y **PWA instalada y verificada** en el móvil de Javier (o el fallback de ADR-7, documentado).
- [ ] Captura completa en **≤5 taps** y **≤15 s** (mediana de 3), con libro auto-asignado, medido en el móvil real.
- [ ] Guardado automático con *Deshacer* funcionando; ninguna confirmación bloqueante en el flujo.
- [ ] Fotos < 400 KB en Storage; OCR llegando en asíncrono y editable.
- [ ] Cron barredor de `pending` huérfanos funcionando (probado matando el navegador tras el disparo).
- [ ] Entrada manual de texto funcionando.
- [ ] RLS verificado: un segundo usuario de prueba no ve datos del primero (ni en tablas ni en Storage).
- [ ] Login por usuario y contraseña funcionando (ADR-8), con la **confirmación de email desactivada** en Supabase y el registro por autoservicio cerrado.
- [ ] Clave de OCR solo en servidor; **JWT verificado, rate limit por usuario activo**, tope de gasto configurado en el proveedor.
- [ ] **Keep-alive programado** y **backup `pg_dump` programado**, ambos con al menos una ejecución correcta comprobada.
- [ ] **Restauración probada una vez:** un backup se restaura en local o en un proyecto de pruebas. Un backup sin restauración probada no es un backup.
- [ ] Este `plan.md` en la raíz del repo y el §0 copiado literal al inicio del `README.md`.
- [ ] Proyecto reproducible desde cero con un comando documentado.

---

## 9. Método de trabajo — proporcional a la fase

En v1.0 este apartado exigía la skill `desarrollo-riguroso` completa (Fases 0 y 1 antes de una sola línea de código, TDD con agentes de rol separados, validator con acta) **para un proyecto cuyo propio presupuesto son dos días**. Las dos cosas no caben a la vez, y el riesgo nº1 del proyecto (que la captura nunca ocurra) se combate poniendo la app en el móvil el sábado, no produciendo documentación.

**Fase 1 — método ligero:**

1. `REQUIREMENTS.md` **corto**: los checks de §8 ya son criterios de aceptación verificables. Se convierten en REQ-001..REQ-012 con su criterio y su marca de parametrizable. ~20 minutos, no una sesión.
2. **Tests solo donde el fallo es silencioso y caro:**
   - **RLS**: un segundo usuario no ve nada del primero (tablas y Storage). Un fallo aquí no se nota hasta que hay familia dentro.
   - **Máquina de estados del OCR**: `pending → done | failed`, idempotencia del disparo, barrido de huérfanos.

   TDD ceremonial sobre componentes de UI de una app personal no paga y se omite deliberadamente.
3. **Cierre de Fase 1:** repaso del DoD punto por punto. Nada se da por hecho sin comprobarlo en el móvil real.

**Fase 2 en adelante — método completo:** entra la familia, sube el coste de un fallo y el proyecto ya ha demostrado que se usa. Aquí sí aplica la skill `desarrollo-riguroso` al completo (parametrización, ciclo TDD con roles separados, validator con acta). Nada se entrega `NO VALIDADO`.

**Cambios de alcance (siempre):** primero §2 de este plan (nueva versión con changelog), después `REQUIREMENTS.md`, después código. Nunca al revés.

---

## 10. Riesgos vigilados

- **El riesgo nº 1 no es técnico:** que la captura real sea más lenta que el post-it. Las métricas de §7 son innegociables y se miden el domingo en el móvil.
- **Calidad del OCR en condiciones reales.** Se decidió no hacer spike previo. Mitigación: validación con 5 fotos reales el **sábado por la mañana**, antes de construir listado y edición. Si el texto sale inservible, hay ~1,5 días para replantear (p. ej. foto + frase clave escrita a mano) en lugar de descubrirlo el domingo por la noche.
- **Andamiaje de PWA.** Terreno nuevo, ningún precedente propio, alto potencial de consumir el sábado. Mitigación: ADR-7 (se monta primero, con fallback definido).
- **Gasto descontrolado del OCR.** El tope del proveedor suele avisar, no cortar. Mitigación: JWT + rate limit + `max_tokens` + disparo idempotente (ADR-4).
- **Tramo 07/09–15/09 sobrecargado.** Vocabulario, repaso, flashcards y exportación en ~3–4 horas efectivas. Riesgo asumido explícitamente; se revisa en la Puerta 1→2 con ritmo real (§2).
- **Scope creep:** regla de `BACKLOG.md` (§2); este plan es la única puerta de cambios de alcance.
- **Pérdida de datos con la familia dentro:** resuelto subiendo keep-alive y backup a Fase 1 (§3), con restauración probada en el DoD.
- **Abandono al 60%:** el criterio de §0 convierte incluso el abandono en un resultado limpio con decisión tomada.

---

## 11. Pendientes de decisión (no bloquean la Fase 1)

- Nombre definitivo (provisional: **Marginalia**).
- **Proveedor y modelo concretos del modelo de visión.** Se decide el sábado por la mañana con la validación de ADR-4: se prueban dos candidatos con las mismas 5 fotos y se elige por calidad de transcripción en español; el coste por 100 capturas es secundario a esa escala (céntimos en cualquier caso).
- Plataforma de despliegue: Vercel o Cloudflare/OpenNext (ADR-1). No es estructural.
- Formato exacto de la exportación Markdown (frontmatter YAML, un fichero por libro) — se especifica al inicio de la Fase 3.

---

## 12. Changelog

**v1.7 — 19/08/2026.** El recorte se adelanta a antes de guardar.

- **Solo se guarda la zona elegida.** La v1.6 subía la foto entera y guardaba las coordenadas del recorte para aplicarlo en el servidor. Se invierte: se recorta en el navegador y a Storage llega únicamente el recorte. Se elimina la columna  y el procesado de imagen en el servidor (migración 007).
- **Guardar pasa de 5 a 6 taps** (§7). La sección llamaba innegociables a esos 5, así que el cambio queda registrado y no dado por bueno en silencio: el DoD debe medirse contra 6.
- **La transcripción vuelve a ser automática.** Con la imagen ya recortada no hay nada que descartar después, así que se recupera el comportamiento del ADR-3: la interfaz confirma al instante y el texto llega solo.
- **Recortador rehecho:** marco ajustable por bordes y esquinas en lugar de dibujar un rectángulo. Con el dedo, dibujar obliga a acertar el trazo a la primera y a repetirlo entero si te pasas; un marco puesto se corrige empujando el lado que sobra.
- **La foto se colapsa** en la pantalla de la captura cuando ya hay texto (§7).

**v1.6 — 18/08/2026.** Fase 2 construida, recorte antes de transcribir, y dos defectos encontrados con datos reales.

- **La Fase 2 se construye antes de abrir la Puerta 1→2**, por decisión explícita de Javier. El §3 dice que las puertas son vinculantes; queda registrado que esta se saltó, no que la regla haya cambiado.
- **§7: la transcripción pasa a ser un acto explícito con recorte previo.** Guardar la foto cuesta los mismos taps; lo que se vuelve explícito es transcribir. Coordenadas guardadas en fracciones, foto original intacta: un recorte mal hecho se rehace.
- **Defecto encontrado en la búsqueda:** el stemmer español no es idempotente («verdades» se indexa como `verdad`, pero la consulta «verdad» produce `verd`) y los acentos rompen la coincidencia («filosofia» sin tilde no encuentra «filosofía»). Ninguno se arregla cambiando de configuración. Se añade una segunda vía de búsqueda por subcadena sin acentos, y se conservan las dos porque cada una cubre lo que la otra no.
- **Defecto encontrado en el OCR:** el plan gratuito de Kimi admite **una sola petición simultánea**. Capturar dos páginas seguidas devolvía un 429 que el código trataba como fallo definitivo, gastando uno de los tres intentos y marcando como `failed` fotos perfectamente transcribibles. Los 429 y 5xx pasan a ser transitorios: se reintentan con espera y no consumen intento.
- **Validado con datos reales:** el modelo `kimi-k2.6` transcribe correctamente una página de libro fotografiada. El paso 2 del §3 queda cumplido, aunque por la vía de usar la app en lugar del spike previo.

**v1.5 — 18/08/2026.** El proxy de OCR pasa de Edge Function a API route.

- **ADR-4:** el proxy que llama al modelo es una API route de Next, no una Edge Function de Supabase. Misma postura de seguridad (clave solo en servidor, JWT verificado) con una herramienta y un despliegue menos. Contrapartida aceptada: el límite de 60 s de Vercel, que el diseño asíncrono del ADR-3 ya tolera.
- Añadidos a la base de datos el estado `processing` y la reclamación atómica que hacen cumplible la idempotencia que el ADR-4 exigía sin decir cómo.

**v1.4 — 18/08/2026.** Proveedor del OCR y vuelta de la parametrización por UI.

- **Kimi (Moonshot) es el proveedor de partida del OCR** (ADR-4), por ser donde hay créditos. Modelos con visión verificados en su documentación: `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.6`. API compatible con OpenAI.
- **DeepSeek descartado para el OCR:** su API pública no acepta imágenes (verificado el 18/08/2026). La idea de alternar «barato/caro» entre Kimi y DeepSeek no es viable; la alternancia se hace **entre modelos de Kimi**, con Claude como opción cara de reserva.
- **La tabla `settings` vuelve al alcance** (§6), revirtiendo la decisión de la v1.1. Aquella la difirió *con una condición escrita*: entraría cuando existiera un valor concreto que hubiera que cambiar sin desplegar. Proveedor y modelo del OCR son ese valor. La condición funcionó como estaba pensada; no es un cambio de criterio.
- **Las claves de API quedan explícitamente fuera de `settings` y de la UI**, en variables de entorno de la Edge Function. Una clave en una tabla legible desde el navegador es una clave publicada.
- **Orden fijado:** tabla y lectura desde la Edge Function ahora; **pantalla de ajustes después del flujo de captura**. El riesgo nº1 del §10 es la velocidad de captura, no el coste de cambiar de modelo.

**v1.3 — 18/08/2026.** Precisión del ADR-8 al chocar con la realidad del primer usuario.

- El identificador de acceso admite **email real o nombre suelto**. La v1.2 daba por hecho que todos los usuarios serían `nombre@marginalia.local`; el primer usuario creado fue un email real, y forzar el esquema interno habría significado borrarlo y rehacerlo sin ganar nada. Los hijos, que pueden no tener email, siguen cubiertos por el nombre suelto.
- **No se contrae ninguna dependencia de correo:** ningún flujo envía email. El identificador sigue siendo solo un identificador.

**v1.2 — 18/08/2026.** Decisión de autenticación, tomada durante el montaje del esqueleto.

- **ADR-8 (nuevo): usuario y contraseña, sin email.** Sustituye a los magic links del §3 de la v1.0/v1.1. El motivo completo está en el propio ADR; en una línea: el emisor de correo integrado de Supabase no es apto para producción, y montar SMTP propio para un login que ocurre una vez por dispositivo es infraestructura desproporcionada.
- **§3:** la fila de Fase 2 pasa de "magic links" a altas manuales desde el panel.
- **Retirado de `BACKLOG.md`** el punto "SMTP propio (Resend) o auth por contraseña": queda decidido aquí y ya no es una decisión pendiente.
- **§8:** el DoD incorpora la desactivación de la confirmación de email, sin la cual los usuarios creados a mano no pueden entrar.

*Trazabilidad:* el código del login se escribió primero con código de 6 dígitos por email y se sustituyó al tomar esta decisión, antes de que nada dependiera de él. El orden plan → código se respetó: esta sección se editó antes de tocar el login.

**v1.1 — 18/08/2026.** Revisión crítica del plan antes del primer commit.

*Decisiones tomadas por Javier en la revisión:*

- **Stack cambiado** a Next 16 + React 19 + Tailwind 4 (ADR-1), sustituyendo Vite + React SPA. Motivo: es el stack rodado en los cuatro proyectos propios existentes; Vite no tenía precedente.
- **Alcance mantenido sin recortes** (§2), pese al riesgo señalado sobre el tramo 07/09–15/09. Se añade punto de control neutral en la Puerta 1→2.
- **Criterio del §0 mantenido sin cambios** (15 capturas / 3 libros, sin condición de días distintos ni de usuario). Se añade la consulta SQL literal, con columnas informativas explícitamente marcadas como fuera del criterio.
- **Sin spike de OCR previo al fin de semana.** Mitigado con validación temprana el sábado por la mañana (ADR-4, §3 orden de trabajo).

*Correcciones de contradicciones internas de la v1.0:*

- **Keep-alive y backup suben de Fase 3 a Fase 1** (§3). La v1.0 metía a la familia el 24/08 y ponía el backup el 07/09: 14 días de datos familiares sin copia, contra lo que el propio documento decía querer evitar.
- **Métrica de §7 corregida.** La secuencia de 5 pasos de la v1.0 omitía el «Usar foto» de la cámara nativa; el flujo real eran 6 y la métrica nacía incumplida. Se elimina la confirmación dentro de la app (guardado automático con *Deshacer*) y se define qué cuenta como tap.
- **Fechas indicativas, puertas vinculantes** (§3). La v1.0 abría la Fase 2 el 24/08, un día después de cerrar la Fase 1, haciendo inalcanzable su propia puerta de ≥10 capturas.

*Mejoras añadidas:*

- **§7:** métrica de tiempo de reloj (≤15 s, mediana de 3). Los taps pueden cumplirse y aun así perder contra el post-it.
- **§5:** `status` partido en `source` + `ocr_status`; `deleted_at` (borrado lógico); `updated_at`; índice parcial sobre `pending`; idioma español fijado para el futuro índice de búsqueda; política de retención de fotos.
- **ADR-3:** mecanismo de disparo del OCR simplificado para Fase 1 (fetch fire-and-forget + cron barredor) en lugar de Database Webhook, que falla en silencio y es difícil de depurar en un fin de semana.
- **ADR-4:** controles de gasto obligatorios (JWT, rate limit, `max_tokens`, idempotencia). El "tope del proveedor" que pedía la v1.0 suele ser un aviso, no un corte.
- **ADR-7 (nuevo):** la PWA se monta primero con la app vacía, con fallback definido.
- **§8:** DoD ampliado con PWA verificada, métrica de tiempo, barrido de huérfanos, rate limit, backup **con restauración probada**.

*Eliminado por no aportar:*

- **Tabla `settings` en Fase 1** (§6) → diferida a `BACKLOG.md`. Sustituida por variables de entorno de la Edge Function + un `config.ts`. Con un usuario y un deploy de 30 segundos, una tabla de configuración con su UI era trabajo sin retorno.
- **Feature flags por fase** (§6). Con un solo usuario, "activar sin ramas largas" es no desplegar todavía esa ruta.
- **Skill `desarrollo-riguroso` completa en Fase 1** (§9) → sustituida por método proporcional (REQUIREMENTS corto desde el DoD + tests solo en RLS y máquina de estados del OCR). La skill completa vuelve en Fase 2, cuando entra la familia y sube el coste de un fallo. La v1.0 exigía sesión completa de requisitos "antes de una sola línea de código" y a la vez cerrar la Fase 1 en dos días: las dos cosas no caben.

**v1.0 — 18/08/2026.** Versión inicial. Archivada en `plan-v1.0.backup.md`.

---

**Cómo usar este documento:** vive en la raíz del repo y como conocimiento del Claude Project. Cada sesión de trabajo empieza leyendo §0 y la fase vigente. Si una conversación propone algo fuera de §2, la respuesta por defecto es `BACKLOG.md`.
