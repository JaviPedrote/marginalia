-- Marginalia · configuración del OCR (§6 del plan v1.4)
--
-- Fila única: es configuración de la aplicación, no de cada usuario. El
-- check(id = 1) impide que existan dos filas y que el código tenga que decidir
-- cuál vale.
--
-- LO QUE NUNCA ENTRA AQUÍ: las claves de API. Viven en variables de entorno del
-- servidor. Esta tabla la lee el navegador para pintar la pantalla de ajustes;
-- una clave aquí sería una clave publicada.

create table if not exists public.settings (
  id              int primary key default 1 check (id = 1),

  -- Proveedor y modelo del OCR. `openai` significa "API con formato OpenAI",
  -- que es lo que hablan Kimi y casi todos: cambiar de proveedor es cambiar
  -- estos tres campos, no código.
  ocr_provider    text not null default 'kimi'
                  check (ocr_provider in ('kimi', 'claude')),
  ocr_model       text not null default 'kimi-k2.6',
  ocr_base_url    text not null default 'https://api.moonshot.ai/v1',

  ocr_prompt      text not null default
    'Transcribe literalmente el texto de esta página de libro.

Reglas:
- Devuelve SOLO el texto transcrito, sin comentarios ni introducción.
- Respeta los saltos de párrafo.
- Conserva tildes, eñes y comillas latinas (« ») tal como aparecen.
- Si hay anotaciones manuscritas al margen, transcríbelas al final precedidas de "[margen] ".
- Si un fragmento es ilegible, escribe [ilegible] en su lugar. No inventes texto.',

  ocr_max_tokens  int not null default 4000 check (ocr_max_tokens between 256 and 32000),

  -- Tope de gasto (ADR-4): el "límite del proveedor" suele avisar, no cortar.
  ocr_daily_limit int not null default 60 check (ocr_daily_limit between 0 and 1000),

  updated_at      timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- RLS: cualquier usuario autenticado lee y edita.
--
-- Con N ≤ 4 usuarios que viven en la misma casa, un rol de administrador es
-- ceremonia sin valor: el peor caso es que un hijo cambie el modelo del OCR y
-- haya que devolverlo. Si algún día entra alguien de fuera del hogar, esto
-- necesita una columna de rol — está anotado en BACKLOG.md.
alter table public.settings enable row level security;

create policy settings_select on public.settings
  for select to authenticated using (true);

create policy settings_update on public.settings
  for update to authenticated using (true) with check (true);

-- Cuántos OCR ha lanzado un usuario hoy. Lo usa el tope diario del ADR-4.
-- Cuenta intentos, no éxitos: si no, un bucle de fallos gasta sin tope.
create or replace function public.ocr_hoy(uid uuid)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(ocr_attempts), 0)
  from public.captures
  where user_id = uid
    and created_at >= date_trunc('day', now());
$$;
