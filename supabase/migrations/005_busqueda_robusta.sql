-- Marginalia · arreglo de la búsqueda
--
-- La migración 004 dejaba la búsqueda solo sobre el tsvector español. Probado
-- contra datos reales, eso falla en dos casos muy comunes en castellano:
--
--   1. El stemmer NO es idempotente. «verdades» se indexa como 'verdad', pero
--      la consulta «verdad» se convierte en 'verd'. No coinciden. Lo mismo con
--      libertad/libertades, realidad/realidades… toda la familia -dad.
--
--   2. Los acentos rompen la coincidencia. «filosofía» se indexa como
--      'filosof'; escribir «filosofia» sin tilde produce 'filosofi'. En un
--      móvil casi nadie escribe las tildes al buscar.
--
-- Ninguno de los dos se arregla cambiando de configuración: son propiedades del
-- stemmer. La solución es no depender solo de él y añadir una segunda vía,
-- por subcadena sin acentos ni mayúsculas.
--
-- Se conservan las dos porque cada una cubre lo que la otra no:
--   · tsvector encuentra «conquistar» dentro de «conquistan» (morfología),
--     cosa que una subcadena no puede.
--   · la subcadena encuentra «libertad» dentro de «libertades» y aguanta la
--     falta de tildes, cosa que el stemmer no.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- `unaccent()` es STABLE, no IMMUTABLE, así que no puede usarse en una columna
-- generada ni en un índice. Con el diccionario indicado de forma explícita el
-- resultado sí es determinista, y esta envoltura lo declara como tal.
create or replace function public.sin_acentos(texto text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent', texto);
$$;

alter table public.captures
  add column if not exists busqueda_plana text
  generated always as (
    lower(public.sin_acentos(coalesce(ocr_text, '') || ' ' || coalesce(note, '')))
  ) stored;

create index if not exists captures_busqueda_plana_idx
  on public.captures using gin (busqueda_plana extensions.gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- Búsqueda combinada.
--
-- Vive en una función y no en filtros del cliente porque combinar un OR entre
-- full-text y subcadena a través de la sintaxis de PostgREST es frágil: la
-- consulta del usuario puede llevar comas, comillas y puntos, que son
-- separadores en esa sintaxis. Aquí llega como parámetro y no se parsea.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.buscar_capturas(
  consulta text default null,
  etiqueta text default null
)
returns setof public.captures
language sql
stable
security invoker
set search_path = ''
as $$
  select c.*
  from public.captures c
  where c.deleted_at is null
    and c.user_id = (select auth.uid())
    and (etiqueta is null or c.tags @> array[etiqueta])
    and (
      consulta is null
      or btrim(consulta) = ''
      or c.busqueda @@ websearch_to_tsquery('spanish', consulta)
      or c.busqueda_plana like '%' || lower(public.sin_acentos(btrim(consulta))) || '%'
    )
  order by c.created_at desc
  limit 50;
$$;
