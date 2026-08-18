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
| 18/08/2026 | SMTP propio (Resend) o auth por contraseña | README. **Decisión obligatoria antes del onboarding familiar**: el SMTP integrado de Supabase no aguanta dar de alta a la familia. |

## Muerto (no se aplaza)

| Fecha | Idea | Por qué |
|---|---|---|
| 18/08/2026 | Highlights populares / suplementarios | Exigen datos agregados de miles de lectores. Con N ≤ 4 usuarios la feature es estructuralmente vacía. |
