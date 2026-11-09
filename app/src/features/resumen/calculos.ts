import type { Pedido } from '../pedidos/api'
import { desglose, type CalcConfig } from '../../lib/pricing'

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

export type Produccion = {
  entregados: number
  conGramos: number // pedidos entregados con gramos cargados en todos sus productos
  kgVendidos: number
  horas: number
  kgComprados: number
  conCosto: number // pedidos con gramos u horas en todos sus productos
  gananciaPromedio: number | null
}

/**
 * Producción del mes, solo con los datos cargados: los pedidos sin gramos u horas
 * no suman kilos ni entran en el promedio.
 */
export function produccion(
  mes: string,
  pedidos: Pedido[],
  compras: { kg: number; fecha: string | null }[],
  cfg: CalcConfig,
  precioKg: number,
): Produccion {
  const entregados = pedidos.filter((p) => p.estado === 'Entregado' && ym(p.fecha) === mes)
  let gramos = 0
  let horas = 0
  let conGramos = 0
  const ganancias: number[] = []

  for (const p of entregados) {
    const items = p.pedido_items ?? []
    for (const i of items) {
      if (i.gramos != null) gramos += Number(i.gramos) * i.cantidad
      if (i.horas != null) horas += Number(i.horas) * i.cantidad
    }
    if (items.length && items.every((i) => i.gramos != null)) conGramos++
    if (items.length && items.every((i) => i.gramos != null || i.horas != null)) {
      const costo = items.reduce((s, i) => s + desglose({ gramos: Number(i.gramos ?? 0), horas: Number(i.horas ?? 0) }, cfg, precioKg).costo * i.cantidad, 0)
      ganancias.push(Number(p.precio_final ?? 0) - costo - cfg.empaque)
    }
  }

  return {
    entregados: entregados.length,
    conGramos,
    kgVendidos: gramos / 1000,
    horas,
    kgComprados: compras.filter((c) => ym(c.fecha) === mes).reduce((s, c) => s + Number(c.kg), 0),
    conCosto: ganancias.length,
    gananciaPromedio: ganancias.length ? ganancias.reduce((a, b) => a + b, 0) / ganancias.length : null,
  }
}

const diasDelMes = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Promedio de 3 días (el día, el anterior y el siguiente) para que la curva muestre la tendencia. */
function suavizar(v: (number | null)[]): (number | null)[] {
  return v.map((x, i) => {
    if (x === null) return null
    const vecinos = [v[i - 1], x, v[i + 1]].filter((n): n is number => n !== null && n !== undefined)
    return vecinos.reduce((a, b) => a + b, 0) / vecinos.length
  })
}

export type CurvaDias = {
  promedio: number[] // 31 valores, suavizados
  mes: (number | null)[] // 31 valores suavizados; null = día que no existe o que todavía no pasó
  crudoPromedio: number[]
  crudoMes: (number | null)[]
  meses: number // cuántos meses entran en el promedio
}

/**
 * Pedidos por día del mes (sin cancelados). El promedio usa todos los meses desde el primer pedido;
 * cada día se divide solo por los meses que lo tienen (el 31 no existe en todos) y que ya pasaron.
 */
export function curvaDias(pedidos: { estado: string; fecha: string | null }[], mes: string, hoy = new Date()): CurvaDias {
  const hoyYm = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  const validos = pedidos.filter((p) => p.estado !== 'Cancelado' && p.fecha)
  const conteo = new Map<string, number>() // "YYYY-MM-DD" -> pedidos
  for (const p of validos) conteo.set(p.fecha!.slice(0, 10), (conteo.get(p.fecha!.slice(0, 10)) ?? 0) + 1)

  const primero = validos.map((p) => p.fecha!.slice(0, 7)).sort()[0] ?? hoyYm
  const todos: string[] = []
  for (let m = primero; m <= hoyYm; m = moverMes(m, 1)) todos.push(m)

  // Días que existen y ya pasaron en un mes dado.
  const diasValidos = (m: string) => (m === hoyYm ? hoy.getDate() : m > hoyYm ? 0 : diasDelMes(m))
  const delDia = (m: string, d: number) => conteo.get(`${m}-${String(d).padStart(2, '0')}`) ?? 0

  const crudoPromedio = Array.from({ length: 31 }, (_, i) => {
    const d = i + 1
    const meses = todos.filter((m) => diasValidos(m) >= d)
    return meses.length ? meses.reduce((s, m) => s + delDia(m, d), 0) / meses.length : 0
  })
  const crudoMes = Array.from({ length: 31 }, (_, i) => (i + 1 <= diasValidos(mes) ? delDia(mes, i + 1) : null))

  return {
    promedio: suavizar(crudoPromedio) as number[],
    mes: suavizar(crudoMes),
    crudoPromedio,
    crudoMes,
    meses: todos.length,
  }
}
