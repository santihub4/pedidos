import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../lib/database.types'

export type Item = Tables<'pedido_items'>
export type Pedido = Tables<'pedidos'> & { pedido_items: Item[] }
export type Producto = Pick<Tables<'productos'>, 'id' | 'nombre' | 'precio_base' | 'gramos' | 'tiempo_horas'>

export function usePedidos() {
  return useQuery({
    queryKey: ['pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*, pedido_items(*)')
        .order('id', { ascending: false })
        .order('id', { referencedTable: 'pedido_items', ascending: true })
      if (error) throw error
      return data as Pedido[]
    },
  })
}

export function useProductosParaPedido() {
  return useQuery({
    queryKey: ['productos', 'para-pedido'],
    queryFn: async () => {
      const { data, error } = await supabase.from('productos').select('id, nombre, precio_base, gramos, tiempo_horas').order('nombre')
      if (error) throw error
      return data as Producto[]
    },
  })
}

export function useCambiarEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, estado }: { id: number; estado: string }) => {
      const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, estado }) => {
      await qc.cancelQueries({ queryKey: ['pedidos'] })
      const antes = qc.getQueryData<Pedido[]>(['pedidos'])
      qc.setQueryData<Pedido[]>(['pedidos'], (l) => l?.map((p) => (p.id === id ? { ...p, estado } : p)))
      return { antes }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['pedidos'], ctx?.antes),
    onSettled: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  })
}

export type ItemForm = {
  producto_id: number | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  gramos: number | null // por unidad
  horas: number | null // por unidad
}
export type PedidoForm = {
  cliente: string
  fecha: string
  estado: string
  descripcion: string
  precio_final: number
  sena_pagada: boolean
  sena_monto: number
  items: ItemForm[]
}

/** Lo que falta cobrar: total menos la seña, si la pagaron. */
export function saldo(p: Pick<Pedido, 'precio_final' | 'sena_pagada' | 'sena_monto'>) {
  const total = Number(p.precio_final ?? 0)
  return p.sena_pagada ? Math.max(total - Number(p.sena_monto ?? 0), 0) : total
}

/** Crea (id null) o edita un pedido con sus ítems, todo en una transacción. */
export function useGuardarPedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, form }: { id: number | null; form: PedidoForm }) => {
      const { items, ...pedido } = form
      const { data, error } = await supabase.rpc('guardar_pedido', {
        p_id: id as number,
        p_pedido: pedido,
        p_items: items,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  })
}

export function useBorrarPedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('pedidos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  })
}

/** Texto corto de lo que lleva un pedido: "Maceta" o "Maceta +2". */
export function resumenItems(p: Pedido) {
  const it = p.pedido_items
  if (!it?.length) return p.producto || 'Sin producto'
  const primero = it[0].cantidad > 1 ? `${it[0].cantidad} × ${it[0].descripcion}` : it[0].descripcion
  return it.length > 1 ? `${primero} +${it.length - 1}` : primero
}
