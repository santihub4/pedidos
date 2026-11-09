alter table public.pedidos
  add column creado_at timestamptz,
  add column impreso_at timestamptz,
  add column listo_at timestamptz,
  add column entregado_at timestamptz;

alter table public.pedidos alter column creado_at set default now();

create or replace function public.marcar_tiempos_estado()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  orden constant text[] := array['Pendiente', 'Impreso', 'Listo para retirar', 'Entregado'];
  nivel int;
begin
  if tg_op = 'UPDATE' and new.estado is not distinct from old.estado then
    return new;
  end if;

  nivel := coalesce(array_position(orden, new.estado), 0);

  if new.estado = 'Impreso' then new.impreso_at := now(); end if;
  if new.estado = 'Listo para retirar' then new.listo_at := now(); end if;
  if new.estado = 'Entregado' then new.entregado_at := now(); end if;

  if nivel between 1 and 3 then
    if nivel < 2 then new.impreso_at := null; end if;
    if nivel < 3 then new.listo_at := null; end if;
    new.entregado_at := null;
  end if;

  return new;
end;
$$;

revoke execute on function public.marcar_tiempos_estado() from public, anon, authenticated;

create trigger pedidos_tiempos_estado
  before insert or update of estado on public.pedidos
  for each row execute function public.marcar_tiempos_estado();
