import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../lib/database.types'

export type Producto = Tables<'productos'>
export type Categoria = Tables<'categorias'>

export function useProductos() {
  return useQuery({
    queryKey: ['productos', 'lista'],
    queryFn: async () => {
      const { data, error } = await supabase.from('productos').select('*').order('nombre')
      if (error) throw error
      return data
    },
  })
}

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('*').order('nombre')
      if (error) throw error
      return data
    },
  })
}

function useRefrescar() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['productos'] })
    qc.invalidateQueries({ queryKey: ['categorias'] })
  }
}

export type ProductoForm = {
  nombre: string
  categoria_id: number | null
  precio_base: number
  gramos: number | null
  tiempo_horas: number | null
  descripcion: string
}

export function useGuardarProducto() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: async ({ id, form, categoriaNombre }: { id: number | null; form: ProductoForm; categoriaNombre: string }) => {
      // `categoria` (texto) se mantiene para que la app vieja lo siga mostrando.
      const fila = { ...form, descripcion: form.descripcion || null, categoria: categoriaNombre }
      const { error } = id === null
        ? await supabase.from('productos').insert(fila)
        : await supabase.from('productos').update(fila).eq('id', id)
      if (error) throw error
    },
    onSuccess: refrescar,
  })
}

export function useBorrarProducto() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('productos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: refrescar,
  })
}

export function useGuardarCategoria() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: async ({ id, nombre }: { id: number | null; nombre: string }) => {
      if (id === null) {
        const { error } = await supabase.from('categorias').insert({ nombre })
        if (error) throw error
        return
      }
      const { error } = await supabase.from('categorias').update({ nombre }).eq('id', id)
      if (error) throw error
      await supabase.from('productos').update({ categoria: nombre }).eq('categoria_id', id)
    },
    onSuccess: refrescar,
  })
}

export function useBorrarCategoria() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: async (id: number) => {
      await supabase.from('productos').update({ categoria: null }).eq('categoria_id', id)
      const { error } = await supabase.from('categorias').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: refrescar,
  })
}

/** Mensaje claro para errores comunes de la base. */
export function mensajeError(e: unknown, accion: string) {
  const code = (e as { code?: string })?.code
  if (code === '23505') return 'Ya existe una con ese nombre.'
  return `No se pudo ${accion}. Revisá la conexión y probá de nuevo.`
}
