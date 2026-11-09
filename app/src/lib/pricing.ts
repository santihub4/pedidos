// Cálculo de costos de impresión. Misma fórmula que la app vieja.

export type CalcConfig = {
  filamento: number // $ por kg (si no hay compras cargadas)
  kwh: number // $ por kWh
  consumo: number // W de la impresora
  vida: number // horas de vida útil de la impresora
  repuestos: number // $ en repuestos durante esa vida útil
  error: number // % de margen por fallas
  multiplicador: number // precio sugerido = costo × multiplicador
}

export const CALC_DEFAULTS: CalcConfig = {
  filamento: 20000, kwh: 140, consumo: 120, vida: 4320, repuestos: 150000, error: 5, multiplicador: 4,
}

export function leerConfig(json: unknown): CalcConfig {
  const c = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>
  const out = { ...CALC_DEFAULTS }
  for (const k of Object.keys(out) as (keyof CalcConfig)[]) {
    const v = Number(c[k])
    if (Number.isFinite(v)) out[k] = v
  }
  return out
}

type Compra = { kg: number; precio: number; fecha: string | null }

/** $ por kg promedio: compras del mes actual, o todas si no hay del mes. */
export function precioKgPromedio(compras: Compra[], hoy = new Date()): number | null {
  const delMes = compras.filter((c) => {
    if (!c.fecha) return false
    const [y, m] = c.fecha.split('-').map(Number)
    return y === hoy.getFullYear() && m === hoy.getMonth() + 1
  })
  const lista = delMes.length ? delMes : compras
  const kg = lista.reduce((s, c) => s + Number(c.kg || 0), 0)
  const precio = lista.reduce((s, c) => s + Number(c.precio || 0), 0)
  return kg > 0 ? precio / kg : null
}

export type Desglose = { material: number; luz: number; desgaste: number; insumos: number; error: number; costo: number }

/** Costo de producir una pieza. */
export function desglose(
  { gramos = 0, horas = 0, insumos = 0 }: { gramos?: number; horas?: number; insumos?: number },
  cfg: CalcConfig,
  precioKg: number,
): Desglose {
  const material = (gramos / 1000) * precioKg
  const luz = (horas * cfg.consumo / 1000) * cfg.kwh
  const desgaste = cfg.vida > 0 ? (horas * cfg.repuestos) / cfg.vida : 0
  const subtotal = material + luz + desgaste + insumos
  const error = subtotal * cfg.error / 100
  return { material, luz, desgaste, insumos, error, costo: subtotal + error }
}

/** Costo de un producto del catálogo, o null si no tiene gramos ni horas. */
export function costoProducto(
  p: { gramos: number | null; tiempo_horas: number | null },
  cfg: CalcConfig,
  precioKg: number,
): number | null {
  const gramos = Number(p.gramos) || 0
  const horas = Number(p.tiempo_horas) || 0
  if (!gramos && !horas) return null
  return desglose({ gramos, horas }, cfg, precioKg).costo
}
