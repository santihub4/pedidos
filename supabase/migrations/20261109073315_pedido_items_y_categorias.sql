insert into public.categorias (user_id, nombre)
select distinct on (user_id, clave) user_id, nombre
from (
  select
    user_id,
    trim(categoria) as nombre,
    translate(lower(trim(categoria)), 'áéíóúü', 'aeiouu') as clave,
    count(*) over (partition by user_id, trim(categoria)) as usos
  from public.productos
  where coalesce(trim(categoria), '') <> ''
) x
order by user_id, clave, usos desc, nombre
on conflict (user_id, nombre) do nothing;

alter table public.productos
  add column categoria_id bigint references public.categorias (id) on delete set null;

update public.productos p
set categoria_id = c.id
from public.categorias c
where c.user_id = p.user_id
  and translate(lower(c.nombre), 'áéíóúü', 'aeiouu')
    = translate(lower(trim(p.categoria)), 'áéíóúü', 'aeiouu');

create index productos_categoria_id_idx on public.productos (categoria_id);

create table public.pedido_items (
  id              bigint generated always as identity primary key,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pedido_id       bigint not null references public.pedidos (id) on delete cascade,
  producto_id     bigint references public.productos (id) on delete set null,
  descripcion     text not null,
  cantidad        integer not null default 1 check (cantidad > 0),
  precio_unitario numeric(12,2) not null default 0 check (precio_unitario >= 0),
  subtotal        numeric(12,2) generated always as (cantidad * precio_unitario) stored,
  created_at      timestamptz not null default now()
);

create index pedido_items_user_id_idx     on public.pedido_items (user_id);
create index pedido_items_pedido_id_idx   on public.pedido_items (pedido_id);
create index pedido_items_producto_id_idx on public.pedido_items (producto_id);

grant select, insert, update, delete on public.pedido_items to authenticated;

alter table public.pedido_items enable row level security;

create policy "ver lo propio" on public.pedido_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "crear lo propio" on public.pedido_items
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.pedidos p where p.id = pedido_id and p.user_id = (select auth.uid()))
  );

create policy "editar lo propio" on public.pedido_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.pedidos p where p.id = pedido_id and p.user_id = (select auth.uid()))
  );

create policy "borrar lo propio" on public.pedido_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into public.pedido_items (user_id, pedido_id, producto_id, descripcion, cantidad, precio_unitario)
select
  p.user_id,
  p.id,
  pr.id,
  coalesce(nullif(trim(p.producto), ''), 'Sin producto'),
  greatest(coalesce(p.cantidad, 1), 1),
  greatest(coalesce(p.precio_unitario, 0), 0)
from public.pedidos p
left join lateral (
  select id from public.productos pr
  where pr.user_id = p.user_id and pr.nombre = p.producto
  order by id
  limit 1
) pr on true;

