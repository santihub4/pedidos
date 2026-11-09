import type { Pedido } from './api'

// Lo que prometés: entregar en 24 a 48 h. Un pedido sin terminar después de esto está atrasado.
export const PROMESA_HORAS = 48
// Días en el almacén después de los cuales conviene avisarle al cliente.
export const ALMACEN_DIAS = 7

const HORA = 3600_000

/** Cuándo se tomó el pedido: el momento en que se cargó o, en los viejos, su fecha. */
export function tomado(p: Pick<Pedido, 'creado_at' | 'fecha'>): Date | null {
  if (p.creado_at) return new Date(p.creado_at)
  if (p.fecha) return new Date(`${p.fecha}T12:00:00`)
  return null
}

export function horasDesde(d: Date, ahora = new Date()) {
  return (ahora.getTime() - d.getTime()) / HORA
}

/** "recién", "hace 5 h", "hace 3 d" */
export function hace(horas: number) {
  if (horas < 1) return 'recién'
  if (horas < 24) return `hace ${Math.floor(horas)} h`
  return `hace ${Math.floor(horas / 24)} d`
}

/** "5 h", "1 d 6 h" */
export function duracion(horas: number) {
  if (horas < 24) return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(Math.max(horas, 0))} h`
  const d = Math.floor(horas / 24)
  const h = Math.round(horas - d * 24)
  return h ? `${d} d ${h} h` : `${d} d`
}

export type Alerta = { texto: string; tarde: boolean }

/** Qué mostrar en la lista según el estado del pedido. */
export function alerta(p: Pedido, ahora = new Date()): Alerta | null {
  if (p.estado === 'Pendiente' || p.estado === 'Impreso') {
    const t = tomado(p)
    if (!t) return null
    const h = horasDesde(t, ahora)
    return { texto: `Pedido ${hace(h)}`, tarde: h > PROMESA_HORAS }
  }
  if (p.estado === 'Listo para retirar' && p.listo_at) {
    const h = horasDesde(new Date(p.listo_at), ahora)
    return { texto: `En el almacén desde ${hace(h)}`, tarde: h > ALMACEN_DIAS * 24 }
  }
  return null
}

/** Horas de impresión que lleva un pedido (solo de los productos con horas cargadas). */
export function horasPedido(p: Pedido) {
  const items = p.pedido_items ?? []
  return {
    horas: items.reduce((s, i) => s + (i.horas != null ? Number(i.horas) * i.cantidad : 0), 0),
    completo: items.length > 0 && items.every((i) => i.horas != null),
  }
}
