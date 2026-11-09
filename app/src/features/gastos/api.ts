import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../lib/database.types'

export type Gasto = Tables<'gastos'>
export type Compra = Tables<'filamentos'>

export function useGastos() {
  return useQuery({
    queryKey: ['gastos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gastos').select('*').order('fecha', { ascending: false }).order('id', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type GastoForm = { concepto: string; categoria: string; monto: number; cantidad: number; unidad: string; fecha: string; descripcion: string }
export type CompraForm = { marca: string; color: string; kg: number; precio: number; fecha: string }

/** Guardar/borrar genérico para gastos y compras de filamento. */
function useTabla<F extends object>(tabla: 'gastos' | 'filamentos') {
  const qc = useQueryClient()
  const refrescar = () => qc.invalidateQueries({ queryKey: [tabla] })
  const guardar = useMutation({
    mutationFn: async ({ id, form }: { id: number | null; form: F }) => {
      const q = supabase.from(tabla)
      const { error } = id === null ? await q.insert(form as never) : await q.update(form as never).eq('id', id)
      if (error) throw error
    },
    onSuccess: refrescar,
  })
  const borrar = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from(tabla).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: refrescar,
  })
  return { guardar, borrar }
}

export const useGastoMut = () => useTabla<GastoForm>('gastos')
export const useCompraMut = () => useTabla<CompraForm>('filamentos')

export const mesDe = (fecha: string | null) => (fecha ?? '').slice(0, 7)
export const mesActual = () => new Date().toISOString().slice(0, 7)

const nombreMes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })
export function etiquetaMes(ym: string) {
  if (!ym) return 'Sin fecha'
  const [y, m] = ym.split('-').map(Number)
  const t = nombreMes.format(new Date(y, m - 1, 1))
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Agrupa por mes (más reciente primero) con el total de cada grupo. */
export function porMes<T>(filas: T[], fecha: (f: T) => string | null, monto: (f: T) => number) {
  const grupos = new Map<string, { filas: T[]; total: number }>()
  for (const f of filas) {
    const k = mesDe(fecha(f))
    const g = grupos.get(k) ?? { filas: [], total: 0 }
    g.filas.push(f)
    g.total += monto(f)
    grupos.set(k, g)
  }
  return [...grupos.entries()].sort(([a], [b]) => b.localeCompare(a))
}
