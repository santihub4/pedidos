import { FLUJO, colorEstado, siguiente, type Estado } from './estados'

type Props = { estado: string; onAvanzar?: () => void; ocupado?: boolean }

/** El estado como capas impresas: cada paso del flujo suma una capa. */
export function Capas({ estado, onAvanzar, ocupado }: Props) {
  const cancelado = estado === 'Cancelado'
  const nivel = FLUJO.indexOf(estado as Estado) + 1
  const prox = siguiente(estado)
  const color = colorEstado[estado as Estado] ?? 'var(--tinta-suave)'

  return (
    <button
      type="button"
      className={'capas' + (cancelado ? ' capas-cancelado' : '')}
      disabled={!prox || !onAvanzar || ocupado}
      onClick={onAvanzar}
      aria-label={prox ? `${estado}. Pasar a ${prox}` : estado}
      title={prox ? `Pasar a ${prox}` : estado}
    >
      {[3, 2, 1, 0].map((i) => (
        <span key={i} style={!cancelado && i < nivel ? { background: color } : undefined} />
      ))}
    </button>
  )
}
