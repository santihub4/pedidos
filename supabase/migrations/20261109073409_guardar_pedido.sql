create or replace function public.guardar_pedido(p_id bigint, p_pedido jsonb, p_items jsonb)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id bigint;
  v_n int := jsonb_array_length(p_items);
  v_resumen text;
  v_cantidad int;
  v_precio numeric(12,2);
begin
  if v_n = 0 then
    raise exception 'El pedido necesita al menos un producto';
  end if;

  select
    min(i->>'descripcion') filter (where ord = 1) || case when v_n > 1 then ' +' || (v_n - 1) else '' end,
    sum((i->>'cantidad')::int),
    case when v_n = 1 then min((i->>'precio_unitario')::numeric) end
  into v_resumen, v_cantidad, v_precio
  from jsonb_array_elements(p_items) with ordinality as t(i, ord);

  if p_id is null then
    insert into public.pedidos (cliente, estado, fecha, descripcion, precio_final, producto, cantidad, precio_unitario)
    values (
      p_pedido->>'cliente',
      coalesce(p_pedido->>'estado', 'Pendiente'),
      coalesce((p_pedido->>'fecha')::date, current_date),
      nullif(p_pedido->>'descripcion', ''),
      (p_pedido->>'precio_final')::numeric,
      v_resumen, v_cantidad, v_precio
    )
    returning id into v_id;
  else
    update public.pedidos set
      cliente = p_pedido->>'cliente',
      estado = coalesce(p_pedido->>'estado', estado),
      fecha = coalesce((p_pedido->>'fecha')::date, fecha),
      descripcion = nullif(p_pedido->>'descripcion', ''),
      precio_final = (p_pedido->>'precio_final')::numeric,
      producto = v_resumen,
      cantidad = v_cantidad,
      precio_unitario = v_precio
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'No se encontró el pedido %', p_id;
    end if;

    delete from public.pedido_items where pedido_id = v_id;
  end if;

  insert into public.pedido_items (pedido_id, producto_id, descripcion, cantidad, precio_unitario)
  select
    v_id,
    nullif(i->>'producto_id', '')::bigint,
    i->>'descripcion',
    (i->>'cantidad')::int,
    (i->>'precio_unitario')::numeric
  from jsonb_array_elements(p_items) as t(i);

  return v_id;
end;
$$;

revoke execute on function public.guardar_pedido(bigint, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_pedido(bigint, jsonb, jsonb) to authenticated;
