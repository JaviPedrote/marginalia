-- Marginalia · Fase 2: etiquetas, búsqueda y vocabulario (§2.3 y §2.4 del plan)

-- ─────────────────────────────────────────────────────────────────────────────
-- Etiquetas
--
-- Array de texto en la propia captura, no tabla de etiquetas + tabla de unión.
-- Con N ≤ 4 usuarios y unos cientos de capturas, el modelo normalizado añade
-- dos tablas y dos joins a cada consulta para resolver un problema que aquí no
-- existe. Renombrar una etiqueta en todas las capturas es un UPDATE con
-- array_replace, que a esta escala es instantáneo.
-- Si algún día hay miles de capturas y jerarquía de etiquetas, esto se
-- normaliza; hasta entonces, no.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.captures
  add column if not exists tags text[] not null default '{}';

create index if not exists captures_tags_idx
  on public.captures using gin (tags);

-- ─────────────────────────────────────────────────────────────────────────────
-- Búsqueda a texto completo
--
-- Columna generada: se mantiene sola en cada INSERT/UPDATE, así que no puede
-- desincronizarse del texto como pasaría con un trigger que alguien olvide.
--
-- El idioma es 'spanish' y se fija aquí: determina cómo se parten las palabras
-- y qué se considera una raíz común («libertad» encuentra «libertades»).
-- Cambiarlo después obliga a reindexar toda la tabla.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.captures
  add column if not exists busqueda tsvector
  generated always as (
    to_tsvector(
      'spanish',
      coalesce(ocr_text, '') || ' ' || coalesce(note, '')
    )
  ) stored;

create index if not exists captures_busqueda_idx
  on public.captures using gin (busqueda);

-- ─────────────────────────────────────────────────────────────────────────────
-- Vocabulario
--
-- Palabra + significado, ligados siempre a un libro y opcionalmente a la
-- captura donde apareció. Sin capture_id la palabra sigue siendo útil; sin
-- book_id no, porque el valor está en recordar dónde la leíste.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.vocab (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  book_id     uuid not null references public.books(id) on delete restrict,
  capture_id  uuid references public.captures(id) on delete set null,
  word        text not null check (length(trim(word)) > 0),
  meaning     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index if not exists vocab_user_created_idx
  on public.vocab (user_id, created_at desc);

create index if not exists vocab_book_idx
  on public.vocab (book_id);

-- Evita duplicar la misma palabra del mismo libro. Índice único parcial y no
-- constraint, porque solo debe aplicar a las filas vivas: borrar una palabra y
-- volver a añadirla tiene que funcionar.
create unique index if not exists vocab_palabra_unica_idx
  on public.vocab (user_id, book_id, lower(trim(word)))
  where deleted_at is null;

create trigger vocab_set_updated_at
  before update on public.vocab
  for each row execute function public.set_updated_at();

alter table public.vocab enable row level security;

create policy vocab_select on public.vocab
  for select using (user_id = (select auth.uid()));
create policy vocab_insert on public.vocab
  for insert with check (user_id = (select auth.uid()));
create policy vocab_update on public.vocab
  for update using (user_id = (select auth.uid()))
          with check (user_id = (select auth.uid()));
create policy vocab_delete on public.vocab
  for delete using (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Etiquetas en uso, para el filtro de la interfaz.
-- Se resuelve en la base de datos porque hacerlo en el cliente obligaría a
-- descargar todas las capturas solo para saber qué etiquetas existen.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.etiquetas_en_uso()
returns table (tag text, usos bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.tag, count(*) as usos
  from public.captures c, unnest(c.tags) as t(tag)
  where c.deleted_at is null
    and c.user_id = (select auth.uid())
  group by t.tag
  order by usos desc, t.tag;
$$;
