-- Marginalia · migración inicial (Fase 1)
-- Corresponde al §5 del plan.md (v1.1).
--
-- Notas de diseño que no son obvias leyendo el DDL:
--   · `source` y `ocr_status` son dos ejes distintos a propósito: el origen de la
--     captura (foto / manual) no es un estado del OCR. Mezclados, una captura
--     manual no podía expresar ningún estado.
--   · `deleted_at`: borrado lógico. Es un móvil, los taps falsos ocurren, y el
--     backup no protege contra un borrado intencionado mal dado.
--   · Todo el producto consulta siempre con `deleted_at is null`.

-- ─────────────────────────────────────────────────────────────────────────────
-- Utilidad: mantener updated_at
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- books
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.books (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null check (length(trim(title)) > 0),
  author     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists books_user_created_idx
  on public.books (user_id, created_at desc);

-- El "libro pegajoso" (§7) necesita saber cuál fue el último libro usado por
-- este usuario; se resuelve por captures.created_at, no aquí.

create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- captures
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.captures (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  book_id    uuid not null references public.books(id) on delete restrict,
  image_path text,                        -- null en entradas manuales
  ocr_text   text,
  note       text,
  page       int check (page is null or page > 0),
  source     text not null
             check (source in ('photo','manual')),
  ocr_status text not null default 'pending'
             check (ocr_status in ('pending','done','failed','skipped')),
  -- Nº de intentos de OCR. Corta los bucles de reintento que gastan dinero (ADR-4).
  ocr_attempts int not null default 0,
  ocr_error  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- Invariantes del modelo, no del código de aplicación:
  -- una foto necesita ruta de imagen; una entrada manual no pasa por OCR.
  constraint captures_photo_has_image
    check (source <> 'photo' or image_path is not null),
  constraint captures_manual_skips_ocr
    check (source <> 'manual' or ocr_status = 'skipped')
);

create index if not exists captures_user_created_idx
  on public.captures (user_id, created_at desc);

create index if not exists captures_book_idx
  on public.captures (book_id);

-- Lo usa el cron barredor de huérfanos (ADR-3): índice parcial, se mantiene
-- diminuto porque en régimen normal casi no hay filas pendientes.
create index if not exists captures_pending_idx
  on public.captures (created_at)
  where ocr_status = 'pending' and deleted_at is null;

create trigger captures_set_updated_at
  before update on public.captures
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS (ADR-6): cada usuario ve y toca solo lo suyo, desde el día 1.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.books    enable row level security;
alter table public.captures enable row level security;

create policy books_select on public.books
  for select using (user_id = (select auth.uid()));
create policy books_insert on public.books
  for insert with check (user_id = (select auth.uid()));
create policy books_update on public.books
  for update using (user_id = (select auth.uid()))
          with check (user_id = (select auth.uid()));
create policy books_delete on public.books
  for delete using (user_id = (select auth.uid()));

create policy captures_select on public.captures
  for select using (user_id = (select auth.uid()));
create policy captures_insert on public.captures
  for insert with check (user_id = (select auth.uid()));
create policy captures_update on public.captures
  for update using (user_id = (select auth.uid()))
          with check (user_id = (select auth.uid()));
create policy captures_delete on public.captures
  for delete using (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: bucket privado `captures`, una carpeta por usuario.
-- Ruta: {user_id}/{capture_id}.jpg
--
-- Si estas sentencias fallan por permisos al ejecutarlas desde la CLI, se
-- aplican igual desde el SQL Editor del panel de Supabase (ver README).
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do nothing;

create policy captures_objects_select on storage.objects
  for select using (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy captures_objects_insert on storage.objects
  for insert with check (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy captures_objects_update on storage.objects
  for update using (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy captures_objects_delete on storage.objects
  for delete using (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
