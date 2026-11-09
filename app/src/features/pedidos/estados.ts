// Mismos textos que guarda la base (constraint pedidos_estado_check).
export const ESTADOS = ['Pendiente', 'Impreso', 'Listo para retirar', 'Entregado', 'Cancelado'] as const
export type Estado = (typeof ESTADOS)[number]

export const FLUJO: Estado[] = ['Pendiente', 'Impreso', 'Listo para retirar', 'Entregado']

export const colorEstado: Record<Estado, string> = {
  Pendiente: 'var(--pendiente)',
  Impreso: 'var(--impreso)',
  'Listo para retirar': 'var(--listo)',
  Entregado: 'var(--entregado)',
  Cancelado: 'var(--cancelado)',
}

/** Siguiente paso del flujo, o null si ya está entregado o cancelado. */
export function siguiente(e: string): Estado | null {
  const i = FLUJO.indexOf(e as Estado)
  return i >= 0 && i < FLUJO.length - 1 ? FLUJO[i + 1] : null
}
