-- Estado 'processing' para el OCR.
--
-- Sin él no hay forma de reclamar una captura de manera atómica: dos llamadas
-- concurrentes (el disparo del cliente y el barrido de huérfanos) verían las
-- dos `pending` y pagarían dos transcripciones de la misma foto. El ADR-4 exige
-- que el disparo sea idempotente; esto es lo que lo hace cumplible.
--
-- La reclamación es un solo UPDATE condicional:
--   update captures set ocr_status = 'processing'
--   where id = ? and ocr_status = 'pending' returning *;
-- Si no devuelve fila, otro ya la cogió y esta llamada se retira.

alter table public.captures
  drop constraint captures_ocr_status_check;

alter table public.captures
  add constraint captures_ocr_status_check
  check (ocr_status in ('pending','processing','done','failed','skipped'));

-- El índice del barrido también mira las que se quedaron colgadas en
-- 'processing' (proceso muerto a media transcripción).
drop index if exists public.captures_pending_idx;

create index captures_pendientes_idx
  on public.captures (created_at)
  where ocr_status in ('pending','processing') and deleted_at is null;
