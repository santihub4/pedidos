-- Migración 1: seguridad y tipos de datos.
--
-- Pensada para no romper la app actual (index.html), con UNA excepción:
-- guardar la calculadora necesita el arreglo de index.html que usa
-- `on_conflict=user_id`. Publicar ese arreglo justo después de aplicar esto.
--
-- Las tablas que la app no usa (configuracion_estadisticas,
-- estadisticas_personalizadas, dashboard_widgets) no se tocan.


-- 0. Dueño de los datos: el único user_id que ya aparece en las tablas que lo tienen.
create temporary table _dueno on commit drop as
select distinct user_id from (
  select user_id from public.categorias
  union all select user_id from public.gastos
  union all select user_id from public.filamentos
  union all select user_id from public.configuracion_calculadora
) t
where user_id is not null;

do $$
declare n int;
begin
  select count(*) into n from _dueno;
  if n <> 1 then
    raise exception 'Se esperaba exactamente un usuario dueño de los datos y hay %', n;
  end if;
end $$;

-- 1. user_id en pedidos y productos (hoy se protegen por email).
alter table public.pedidos
  add column user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table public.productos
  add column user_id uuid default auth.uid() references auth.users (id) on delete cascade;

-- 2. Completar los user_id vacíos con el dueño.
update public.pedidos                   set user_id = (select user_id from _dueno) where user_id is null;
update public.productos                 set user_id = (select user_id from _dueno) where user_id is null;
update public.categorias                set user_id = (select user_id from _dueno) where user_id is null;
update public.gastos                    set user_id = (select user_id from _dueno) where user_id is null;
update public.filamentos                set user_id = (select user_id from _dueno) where user_id is null;
update public.configuracion_calculadora set user_id = (select user_id from _dueno) where user_id is null;

-- 3. user_id obligatorio e indexado.
alter table public.pedidos                   alter column user_id set not null;
alter table public.productos                 alter column user_id set not null;
alter table public.categorias                alter column user_id set not null;
alter table public.gastos                    alter column user_id set not null;
alter table public.filamentos                alter column user_id set not null;
alter table public.configuracion_calculadora alter column user_id set not null;

create index if not exists pedidos_user_id_idx    on public.pedidos (user_id);
create index if not exists productos_user_id_idx  on public.productos (user_id);
create index if not exists categorias_user_id_idx on public.categorias (user_id);
create index if not exists gastos_user_id_idx     on public.gastos (user_id);
create index if not exists filamentos_user_id_idx on public.filamentos (user_id);

-- 4. Plata en numeric (double precision tiene errores de redondeo).
alter table public.pedidos
  alter column precio_unitario type numeric(12,2) using round(precio_unitario::numeric, 2),
  alter column precio_final    type numeric(12,2) using round(precio_final::numeric, 2);
alter table public.productos
  alter column precio_base type numeric(12,2) using round(precio_base::numeric, 2);

-- 5. Estado: solo los valores que usa la app (mismos textos, así no se rompe nada).
update public.pedidos set estado = 'Pendiente' where estado is null;
alter table public.pedidos
  alter column estado set default 'Pendiente',
  alter column estado set not null,
  add constraint pedidos_estado_check
    check (estado in ('Pendiente', 'Impreso', 'Listo para retirar', 'Entregado', 'Cancelado'));

-- 6. Calculadora: ya tiene unique (user_id), no hace falta nada.

-- 7. Categorías: el nombre era único en toda la tabla; pasa a ser único por usuario.
alter table public.categorias drop constraint categorias_nombre_key;
alter table public.categorias
  add constraint categorias_user_id_nombre_key unique (user_id, nombre);

-- filamentos era la única tabla sin FK de user_id a auth.users.
alter table public.filamentos
  add constraint filamentos_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;

-- 8. Políticas: se reemplazan todas por políticas por usuario, solo para usuarios logueados.
do $$
declare
  r record;
  t text;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('pedidos', 'productos', 'categorias', 'gastos', 'filamentos', 'configuracion_calculadora')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;

  foreach t in array array['pedidos', 'productos', 'categorias', 'gastos', 'filamentos', 'configuracion_calculadora']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "ver lo propio" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "crear lo propio" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "editar lo propio" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "borrar lo propio" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

