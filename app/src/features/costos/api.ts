import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { leerConfig, precioKgPromedio, type CalcConfig } from '../../lib/pricing'

export function useConfigCalculadora() {
  return useQuery({
    queryKey: ['calculadora'],
    queryFn: async () => {
      const { data, error } = await supabase.from('configuracion_calculadora').select('configuracion').maybeSingle()
      if (error) throw error
      return leerConfig(data?.configuracion)
    },
  })
}

export function useComprasFilamento() {
  return useQuery({
    queryKey: ['filamentos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('filamentos').select('*').order('fecha', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Configuración de costos y $/kg actual, listos para calcular. */
export function useCostos(): { cfg: CalcConfig; precioKg: number; listo: boolean } | null {
  const cfg = useConfigCalculadora()
  const compras = useComprasFilamento()
  if (!cfg.data) return null
  const precioKg = precioKgPromedio(compras.data ?? []) ?? cfg.data.filamento
  return { cfg: cfg.data, precioKg, listo: !compras.isLoading }
}
