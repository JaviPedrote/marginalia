-- El recorte pasa a hacerse en el navegador, antes de subir la foto (plan v1.7).
--
-- La v1.6 guardaba la foto entera más las coordenadas del recorte, y recortaba
-- en el servidor antes de transcribir. Se cambia por decisión de producto: a
-- Storage debe llegar solo la zona elegida, no la página completa.
--
-- Consecuencias:
--   · La columna `crop` deja de tener sentido: la imagen almacenada YA es el
--     recorte, no hay nada que recortar después.
--   · Se pierde la posibilidad de reencuadrar sin volver a fotografiar. Es el
--     coste aceptado a cambio de no guardar márgenes en blanco ni mantener dos
--     representaciones de la misma foto.
--
-- Se elimina en lugar de dejarla sin uso: una columna muerta en el esquema es
-- una invitación a que alguien la vuelva a leer dentro de tres meses.

alter table public.captures
  drop constraint if exists captures_crop_valido;

alter table public.captures
  drop column if exists crop;
