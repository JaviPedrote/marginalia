-- Marginalia · recorte de la zona a transcribir
--
-- Fotografiar una página entera para quedarse con un párrafo tiene dos costes:
-- la transcripción sale llena de texto que no interesa, y se pagan tokens por
-- todo lo que sobra. Recortando, ambos bajan.
--
-- Se guardan las COORDENADAS del recorte, no la imagen recortada:
--   · La foto original se conserva intacta, que es lo que exige el ADR-3.
--     Un recorte mal hecho se rehace; una imagen recortada mal es permanente.
--   · Reencuadrar y volver a transcribir no necesita al cliente ni otra subida.
--
-- Las coordenadas son fracciones de 0 a 1 sobre el lado correspondiente, no
-- píxeles: así el recorte hecho en una pantalla de móvil sigue siendo válido
-- aunque la imagen se sirva o se procese a otra resolución.

alter table public.captures
  add column if not exists crop jsonb;

alter table public.captures
  add constraint captures_crop_valido check (
    crop is null
    or (
      (crop ->> 'x')::numeric >= 0 and (crop ->> 'x')::numeric <= 1
      and (crop ->> 'y')::numeric >= 0 and (crop ->> 'y')::numeric <= 1
      and (crop ->> 'w')::numeric > 0 and (crop ->> 'w')::numeric <= 1
      and (crop ->> 'h')::numeric > 0 and (crop ->> 'h')::numeric <= 1
      and (crop ->> 'x')::numeric + (crop ->> 'w')::numeric <= 1.0001
      and (crop ->> 'y')::numeric + (crop ->> 'h')::numeric <= 1.0001
    )
  );

comment on column public.captures.crop is
  'Recorte a transcribir, en fracciones 0-1: {"x":0.1,"y":0.2,"w":0.8,"h":0.3}. Null = la foto entera.';
