import type { Pedido } from '../pedidos/api'

type Gasto = { monto: number; fecha: string | null }
type Compra = { precio: number; fecha: string | null }

const ym = (f: string | null) => (f ?? '').slice(0, 7)

/** Últimos n meses terminando en `hasta` (YYYY-MM), del más viejo al más nuevo. */
export function ultimosMeses(n: number, hasta: string): string[] {
  const [y, m] = hasta.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - (n - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

export function moverMes(mes: string, delta: number) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export type Mes = {
  mes: string
  ingresos: number
  entregados: number
  ticket: number
  gastos: number
  filamento: number
  ganancia: number
}

/** Ingresos = pedidos entregados con fecha en el mes (igual que la app vieja). */
export function resumenPorMes(meses: string[], pedidos: Pedido[], gastos: Gasto[], compras: Compra[]): Mes[] {
  const base = new Map(meses.map((m) => [m, { mes: m, ingresos: 0, entregados: 0, ticket: 0, gastos: 0, filamento: 0, ganancia: 0 }]))
  for (const p of pedidos) {
    const r = base.get(ym(p.fecha))
    if (r && p.estado === 'Entregado') { r.ingresos += Number(p.precio_final ?? 0); r.entregados++ }
  }
  for (const g of gastos) { const r = base.get(ym(g.fecha)); if (r) r.gastos += Number(g.monto) }
  for (const c of compras) { const r = base.get(ym(c.fecha)); if (r) r.filamento += Number(c.precio) }
  return [...base.values()].map((r) => ({
    ...r,
    ticket: r.entregados ? r.ingresos / r.entregados : 0,
    ganancia: r.ingresos - r.gastos - r.filamento,
  }))
}

export type Top = { nombre: string; cantidad: number; total: number }

/** Productos más vendidos (entregados) en el mes, por plata. */
export function topProductos(mes: string, pedidos: Pedido[], n = 5): Top[] {
  const m = new Map<string, Top>()
  for (const p of pedidos) {
    if (p.estado !== 'Entregado' || ym(p.fecha) !== mes) continue
    const items = p.pedido_items ?? []
    // Se reparte lo cobrado (con descuentos incluidos) entre los ítems.
    const suma = items.reduce((s, i) => s + i.cantidad * Number(i.precio_unitario), 0)
    const cobrado = Number(p.precio_final ?? 0)
    for (const i of items) {
      const t = m.get(i.descripcion) ?? { nombre: i.descripcion, cantidad: 0, total: 0 }
      t.cantidad += i.cantidad
      t.total += suma > 0 ? (i.cantidad * Number(i.precio_unitario) / suma) * cobrado : cobrado / items.length
      m.set(i.descripcion, t)
    }
  }
  return [...m.values()].sort((a, b) => b.total - a.total).slice(0, n)
}
