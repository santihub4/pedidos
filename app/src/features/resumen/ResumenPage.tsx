import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { plata } from '../../lib/format'
import { usePedidos } from '../pedidos/api'
import { useGastos, etiquetaMes, mesActual } from '../gastos/api'
import { useComprasFilamento, useCostos } from '../costos/api'
import { salir, useSession } from '../../auth/useSession'
import { moverMes, produccion, resumenPorMes, topProductos, ultimosMeses, type Mes } from './calculos'

const corto = new Intl.DateTimeFormat('es-AR', { month: 'short' })
const mesCorto = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return corto.format(new Date(y, m - 1, 1)).replace('.', '')
}

export function ResumenPage() {
  const { data: pedidos, isLoading } = usePedidos()
  const { data: gastos = [] } = useGastos()
  const { data: compras = [] } = useComprasFilamento()
  const hoy = mesActual()
  const [mes, setMes] = useState(hoy)

  const meses = useMemo(() => ultimosMeses(12, hoy), [hoy])
  const serie = useMemo(
    () => resumenPorMes(meses.includes(mes) ? meses : [...meses, mes], pedidos ?? [], gastos, compras),
    [meses, mes, pedidos, gastos, compras],
  )
  const actual = serie.find((s) => s.mes === mes)!
  const anterior = useMemo(() => resumenPorMes([moverMes(mes, -1)], pedidos ?? [], gastos, compras)[0], [mes, pedidos, gastos, compras])
  const top = useMemo(() => topProductos(mes, pedidos ?? []), [mes, pedidos])

  if (isLoading) return <main className="contenido"><h1 className="titulo">Resumen</h1><p className="vacio">Cargando…</p></main>

  return (
    <main className="contenido">
      <header className="cabecera">
        <h1 className="titulo">Resumen</h1>
        <div className="selector-mes">
          <button className="btn-icono" aria-label="Mes anterior" onClick={() => setMes(moverMes(mes, -1))}>‹</button>
          <span>{etiquetaMes(mes)}</span>
          <button className="btn-icono" aria-label="Mes siguiente" disabled={mes >= hoy} onClick={() => setMes(moverMes(mes, 1))}>›</button>
        </div>
      </header>

      <section className="ganancia" aria-label="Ganancia del mes">
        <span className="ganancia-label">Ganancia</span>
        <b className={'ganancia-valor num' + (actual.ganancia < 0 ? ' negativa' : '')}>{plata(actual.ganancia)}</b>
        <Variacion actual={actual.ganancia} antes={anterior.ganancia} mesAntes={anterior.mes} />
      </section>

      <dl className="tiles num">
        <Tile label="Cobrado" valor={plata(actual.ingresos)} detalle={`${actual.entregados} pedidos entregados`} />
        <Tile label="Gastos" valor={plata(actual.gastos)} />
        <Tile label="Filamento" valor={plata(actual.filamento)} />
        <Tile label="Ticket promedio" valor={actual.entregados ? plata(actual.ticket) : '—'} />
      </dl>

      <section className="bloque">
        <h2 className="bloque-titulo">Cobrado por mes</h2>
        <Barras serie={serie.filter((s) => meses.includes(s.mes))} elegido={mes} onElegir={setMes} />
      </section>

      <Produccion mes={mes} />

      <section className="bloque">
        <h2 className="bloque-titulo">Lo más vendido en {etiquetaMes(mes).toLowerCase()}</h2>
        {top.length === 0 ? <p className="vacio">No hay pedidos entregados en este mes.</p> : (
          <ol className="top">
            {top.map((t) => (
              <li key={t.nombre}>
                <Link
                  className="top-fila"
                  to={`/pedidos?${new URLSearchParams({ estado: 'Entregado', mes, q: t.nombre })}`}
                  aria-label={`Ver los pedidos de ${t.nombre} en ${etiquetaMes(mes).toLowerCase()}`}
                >
                  <span className="top-nombre">{t.nombre}</span>
                  <span className="top-cant num">{t.cantidad} u.</span>
                  <span className="top-total num">{plata(t.total)}</span>
                  <span className="top-ir" aria-hidden="true">›</span>
                  <span className="top-barra" style={{ width: `${(t.total / top[0].total) * 100}%` }} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Cuenta />
    </main>
  )
}

const kg = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })
const hs = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

function Produccion({ mes }: { mes: string }) {
  const { data: pedidos = [] } = usePedidos()
  const { data: compras = [] } = useComprasFilamento()
  const costos = useCostos()
  if (!costos) return null
  const p = produccion(mes, pedidos, compras, costos.cfg, costos.precioKg)
  const dif = p.kgComprados - p.kgVendidos

  return (
    <section className="bloque">
      <h2 className="bloque-titulo">Producción</h2>
      <dl className="tiles num">
        <Tile label="Filamento vendido" valor={`${kg.format(p.kgVendidos)} kg`} />
        <Tile label="Filamento comprado" valor={`${kg.format(p.kgComprados)} kg`} />
        <Tile label="Horas de impresión" valor={`${hs.format(p.horas)} h`} />
        <Tile
          label="Te deja cada venta"
          valor={p.gananciaPromedio === null ? '—' : plata(p.gananciaPromedio)}
          detalle={p.gananciaPromedio === null ? undefined : 'en promedio, descontando costos'}
        />
      </dl>
      {(p.kgVendidos > 0 || p.kgComprados > 0) && Math.abs(dif) >= 0.01 && (
        <p className="ayuda num">
          {dif > 0
            ? `Compraste ${kg.format(dif)} kg más de lo que vendiste.`
            : `Vendiste ${kg.format(-dif)} kg más de lo que compraste: usaste filamento de meses anteriores.`}
        </p>
      )}
      {p.entregados > 0 && (
        <p className="ayuda">
          Se calcula solo con los pedidos que tienen gramos y horas cargados: {p.conGramos} de {p.entregados} entregados este mes tienen gramos.
          {costos.cfg.empaque === 0 && ' El costo de empaque está en $0; lo podés cargar en Calculadora → Costos fijos.'}
        </p>
      )}
    </section>
  )
}

function Cuenta() {
  const session = useSession()
  return (
    <footer className="cuenta">
      <span>{session?.user.email ?? 'Modo de prueba'}</span>
      <button className="btn" onClick={() => salir()}>Salir</button>
    </footer>
  )
}

function Tile({ label, valor, detalle }: { label: string; valor: string; detalle?: string }) {
  return (
    <div className="tile">
      <dt>{label}</dt>
      <dd>{valor}{detalle && <small>{detalle}</small>}</dd>
    </div>
  )
}

function Variacion({ actual, antes, mesAntes }: { actual: number; antes: number; mesAntes: string }) {
  const dif = actual - antes
  if (!antes || Math.abs(dif) < 1) return null
  const nombre = etiquetaMes(mesAntes).split(' ')[0].toLowerCase()
  return (
    <span className="variacion num">
      {dif > 0 ? '▲' : '▼'} {plata(Math.abs(dif))} {dif > 0 ? 'más' : 'menos'} que en {nombre}
    </span>
  )
}

/** Barras verticales; el mes elegido va en color lleno, el resto atenuado. */
function Barras({ serie, elegido, onElegir }: { serie: Mes[]; elegido: string; onElegir: (m: string) => void }) {
  const [hover, setHover] = useState<Mes | null>(null)
  const max = Math.max(...serie.map((s) => s.ingresos), 1)
  const W = 100 / serie.length

  return (
    <div className="barras">
      <div className="barras-tooltip num" aria-hidden="true" style={{ visibility: hover ? 'visible' : 'hidden' }}>
        {hover && <>{etiquetaMes(hover.mes)} · cobrado {plata(hover.ingresos)} · ganancia {plata(hover.ganancia)}</>}
      </div>
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="barras-svg" role="img"
        aria-label="Cobrado por mes en los últimos 12 meses">
        <line x1="0" x2="100" y1="50" y2="50" className="barras-base" />
        {serie.map((s, i) => {
          const h = (s.ingresos / max) * 46
          return (
            <rect key={s.mes} x={i * W + W * 0.15} width={W * 0.7} y={50 - h} height={h} rx="0.8"
              className={'barra-mes' + (s.mes === elegido ? ' elegida' : '')} />
          )
        })}
      </svg>
      <div className="barras-ejes">
        {serie.map((s) => (
          <button
            key={s.mes} type="button"
            className={'barras-hit' + (s.mes === elegido ? ' elegida' : '')}
            onClick={() => onElegir(s.mes)}
            onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(s)} onBlur={() => setHover(null)}
            aria-label={`${etiquetaMes(s.mes)}: cobrado ${plata(s.ingresos)}, ganancia ${plata(s.ganancia)}`}
            aria-pressed={s.mes === elegido}
          >
            {mesCorto(s.mes)}
          </button>
        ))}
      </div>
    </div>
  )
}
