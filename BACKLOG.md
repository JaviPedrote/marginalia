# Backlog

Reglas (§2 del `plan.md`):

- **Toda idea nueva entra aquí con fecha, no en el código.**
- Una idea solo pasa al alcance editando el §2 del `plan.md` en una nueva versión con changelog.
- Si una conversación propone algo que no está en el §2, la respuesta por defecto es este fichero.

---

## Aplazado

| Fecha | Idea | Origen / condición para entrar |
|---|---|---|
| 18/08/2026 | Estadísticas de lectura y repaso | Plan v1.0 §2. Una tarde de trabajo, cuando haya datos que contar. |
| 18/08/2026 | Cola offline con IndexedDB | Plan v1.0 §2. Candidata a v1.1 **solo si** alguna vez se captura sin cobertura. |
| 18/08/2026 | Tabla `settings` con UI de administración | Plan v1.1 §6. Entra cuando exista un valor concreto que la familia deba cambiar sin Javier. |
| 18/08/2026 | Disparo del OCR por Database Webhook (`pg_net`) | Plan v1.1 ADR-3. Sustituye al `fetch` + cron barredor si este da problemas en Fase 2. |
| 18/08/2026 | **Backup de las fotos de Storage** | El `pg_dump` solo cubre la base de datos. El ADR-3 dice que "la foto ya es la nota": perder el bucket es perder las notas. **Decisión pendiente antes de que entre la familia**; requiere una `service_role key` como secreto. |
| 18/08/2026 | Destino duradero para los backups | Los artefactos de GitHub caducan a los 90 días. Entra **si el proyecto sobrevive al 15/09**: repositorio privado aparte, o subida a almacenamiento externo. |
| 18/08/2026 | Vigilar que el keep-alive no se apague solo | GitHub desactiva los workflows programados tras 60 días sin actividad en el repo. Sin alerta, la pausa de Supabase llegaría en silencio. Entra si el proyecto pasa a modo mantenimiento. |

## Resuelto

| Fecha | Idea | Desenlace |
|---|---|---|
| 18/08/2026 | SMTP propio (Resend) para el login por email | **Descartado el mismo día.** Se decidió auth por usuario y contraseña, que elimina el email del login: plan v1.2, ADR-8. |

## Muerto (no se aplaza)

| Fecha | Idea | Por qué |
|---|---|---|
| 18/08/2026 | Highlights populares / suplementarios | Exigen datos agregados de miles de lectores. Con N ≤ 4 usuarios la feature es estructuralmente vacía. |
