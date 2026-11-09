import { useMemo, useState } from 'react'
import { usePedidos } from '../pedidos/api'
import { etiquetaMes } from '../gastos/api'
import { curvaDias } from './calculos'

const W = 310 // 10 unidades por día
const H = 100
const x = (dia: number) => (dia - 1) * 10 + 5
const dec = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })
const MARCAS = [1, 5, 10, 15, 20, 25, 31]

/** Curva suave (Catmull-Rom) que se corta donde hay días sin dato. */
function camino(valores: (number | null)[], y: (v: number) => number) {
  const tramos: [number, number][][] = [[]]
  valores.forEach((v, i) => {
    if (v === null) { if (tramos.at(-1)!.length) tramos.push([]); return }
    tramos.at(-1)!.push([x(i + 1), y(v)])
  })
  return tramos.filter((t) => t.length > 1).map((p) => {
    let d = `M${p[0][0]},${p[0][1]}`
    for (let i = 0; i < p.length - 1; i++) {
      const [a, b, c, e] = [p[i - 1] ?? p[i], p[i], p[i + 1], p[i + 2] ?? p[i + 1]]
      const c1y = Math.min(H - 4, b[1] + (c[1] - a[1]) / 6)
      const c2y = Math.min(H - 4, c[1] - (e[1] - b[1]) / 6)
      d += ` C${b[0] + (c[0] - a[0]) / 6},${c1y} ${c[0] - (e[0] - b[0]) / 6},${c2y} ${c[0]},${c[1]}`
    }
    return d
  }).join(' ')
}

export function CurvaDiasMes({ mes }: { mes: string }) {
  const { data: pedidos = [] } = usePedidos()
  const c = useMemo(() => curvaDias(pedidos, mes), [pedidos, mes])
  const [dia, setDia] = useState<number | null>(null)

  const max = Math.max(c.maximo, ...c.mes.filter((v): v is number => v !== null), 0.5)
  const y = (v: number) => H - 4 - (v / max) * (H - 12)
  const nombreMes = etiquetaMes(mes)
  const i = dia === null ? null : dia - 1

  return (
    <section className="bloque">
      <h2 className="bloque-titulo">Cuándo te piden</h2>
      <div className="curva-leyenda">
        <span><i className="linea-mes" aria-hidden="true" />{nombreMes}</span>
        <span><i className="linea-promedio" aria-hidden="true" />Promedio de {c.meses} {c.meses === 1 ? 'mes' : 'meses'}</span>
      </div>

      <div className="barras-tooltip num" aria-live="polite">
        {i !== null
          ? <>Día {dia}: {dec.format(c.crudoPromedio[i])} pedidos en promedio{c.crudoMes[i] !== null ? ` · en ${nombreMes.split(' ')[0].toLowerCase()}, ${c.crudoMes[i]}` : ''}</>
          : <span className="ayuda">Pasá el dedo o el mouse por la curva para ver cada día.</span>}
      </div>

      <div className="curva">
        <span className="curva-max num" aria-hidden="true">{dec.format(max)}</span>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="curva-svg" role="img"
          aria-label={`Pedidos por día del mes: ${nombreMes} comparado con el promedio`}>
          <line x1="0" x2={W} y1={H - 4} y2={H - 4} className="barras-base" />
          <line x1="0" x2={W} y1={y(max)} y2={y(max)} className="curva-grilla" />
          {i !== null && <line x1={x(dia!)} x2={x(dia!)} y1="0" y2={H} className="curva-cruz" />}
          <path d={camino(c.promedio, y)} className="curva-promedio" />
          <path d={camino(c.mes, y)} className="curva-mes" />
        </svg>
        {i !== null && (
          <>
            <span className="curva-punto promedio" style={{ left: `${(x(dia!) / W) * 100}%`, top: `${(y(c.promedio[i]) / H) * 100}%` }} />
            {c.mes[i] !== null && (
              <span className="curva-punto" style={{ left: `${(x(dia!) / W) * 100}%`, top: `${(y(c.mes[i]!) / H) * 100}%` }} />
            )}
          </>
        )}
        <div className="curva-hits" onMouseLeave={() => setDia(null)}>
          {Array.from({ length: 31 }, (_, k) => (
            <button
              key={k} type="button" tabIndex={-1} aria-hidden="true"
              onMouseEnter={() => setDia(k + 1)} onClick={() => setDia(k + 1)} onFocus={() => setDia(k + 1)}
            />
          ))}
        </div>
      </div>

      <div className="curva-ejes num" aria-hidden="true">
        {MARCAS.map((d) => <span key={d} style={{ left: `${(x(d) / W) * 100}%` }}>{d}</span>)}
      </div>
      <p className="ayuda">Pedidos por día del mes, sin cancelados. Cada punto promedia ese día con el anterior y el siguiente.</p>
    </section>
  )
}
