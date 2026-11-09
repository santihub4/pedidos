import { useMemo, useState } from 'react'
import { fecha, plata } from '../../lib/format'
import { precioKgPromedio } from '../../lib/pricing'
import { useComprasFilamento } from '../costos/api'
import { etiquetaMes, mesActual, mesDe, porMes, useGastos, type Compra, type Gasto } from './api'
import { CompraSheet, GastoSheet } from './Sheets'

type Vista = 'gastos' | 'filamento'

export function GastosPage() {
  const [vista, setVista] = useState<Vista>('gastos')
  const { data: gastos, isLoading: cargandoG } = useGastos()
  const { data: compras, isLoading: cargandoC } = useComprasFilamento()
  const [gasto, setGasto] = useState<Gasto | null | undefined>(undefined)
  const [compra, setCompra] = useState<Compra | null | undefined>(undefined)

  const mes = mesActual()
  const gastosMes = (gastos ?? []).filter((g) => mesDe(g.fecha) === mes).reduce((s, g) => s + Number(g.monto), 0)
  const comprasMes = (compras ?? []).filter((c) => mesDe(c.fecha) === mes)
  const filamentoMes = comprasMes.reduce((s, c) => s + Number(c.precio), 0)
  const kgMes = comprasMes.reduce((s, c) => s + Number(c.kg), 0)
  const precioKg = precioKgPromedio(compras ?? [])

  const gruposG = useMemo(() => porMes(gastos ?? [], (g) => g.fecha, (g) => Number(g.monto)), [gastos])
  const gruposC = useMemo(() => porMes(compras ?? [], (c) => c.fecha, (c) => Number(c.precio)), [compras])
  const sugerencias = useMemo(() => ({
    conceptos: [...new Set((gastos ?? []).map((g) => g.concepto))],
    categorias: [...new Set((gastos ?? []).map((g) => g.categoria).filter(Boolean) as string[])],
    marcas: [...new Set((compras ?? []).map((c) => c.marca).filter(Boolean) as string[])],
  }), [gastos, compras])

  return (
    <main className="contenido">
      <header className="cabecera">
        <h1 className="titulo">Gastos</h1>
        <button className="btn btn-primario" onClick={() => (vista === 'gastos' ? setGasto(null) : setCompra(null))}>
          {vista === 'gastos' ? '+ Nuevo gasto' : '+ Nueva compra'}
        </button>
      </header>

      <div className="resumen num">
        <span><b>{plata(gastosMes)}</b>gastos este mes</span>
        <span><b>{plata(filamentoMes)}</b>filamento este mes{kgMes ? ` (${kgMes.toLocaleString('es-AR')} kg)` : ''}</span>
        {precioKg && <span><b>{plata(precioKg)}</b>por kg</span>}
      </div>

      <div className="pestanas" role="tablist">
        <button role="tab" aria-selected={vista === 'gastos'} onClick={() => setVista('gastos')}>Gastos generales</button>
        <button role="tab" aria-selected={vista === 'filamento'} onClick={() => setVista('filamento')}>Filamento</button>
      </div>

      {vista === 'gastos' ? (
        cargandoG ? <p className="vacio">Cargando…</p> : gruposG.length === 0 ? (
          <p className="vacio">Todavía no cargaste gastos.</p>
        ) : gruposG.map(([ym, g]) => (
          <section key={ym} className="grupo-mes">
            <h2 className="grupo-titulo"><span>{etiquetaMes(ym)}</span><span className="num">{plata(g.total)}</span></h2>
            <ul className="lista">
              {g.filas.map((x) => (
                <li key={x.id}>
                  <button className="fila-abrir" onClick={() => setGasto(x)}>
                    <span>
                      <span className="pedido-cliente">{x.concepto}</span>
                      <span className="pedido-detalle">{[x.categoria, fecha(x.fecha)].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="pedido-total num">{plata(Number(x.monto))}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        cargandoC ? <p className="vacio">Cargando…</p> : gruposC.length === 0 ? (
          <p className="vacio">Todavía no cargaste compras de filamento.</p>
        ) : gruposC.map(([ym, g]) => (
          <section key={ym} className="grupo-mes">
            <h2 className="grupo-titulo"><span>{etiquetaMes(ym)}</span><span className="num">{plata(g.total)}</span></h2>
            <ul className="lista">
              {g.filas.map((x) => (
                <li key={x.id}>
                  <button className="fila-abrir" onClick={() => setCompra(x)}>
                    <span>
                      <span className="pedido-cliente">{[x.marca, x.color].filter(Boolean).join(' · ') || 'Filamento'}</span>
                      <span className="pedido-detalle">{Number(x.kg).toLocaleString('es-AR')} kg · {fecha(x.fecha)}</span>
                    </span>
                    <span>
                      <span className="pedido-total num">{plata(Number(x.precio))}</span>
                      <span className="producto-costo num">{plata(Number(x.precio) / Number(x.kg))}/kg</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {gasto !== undefined && (
        <GastoSheet key={gasto?.id ?? 'nuevo'} gasto={gasto} conceptos={sugerencias.conceptos} categorias={sugerencias.categorias} onCerrar={() => setGasto(undefined)} />
      )}
      {compra !== undefined && (
        <CompraSheet key={compra?.id ?? 'nueva'} compra={compra} marcas={sugerencias.marcas} onCerrar={() => setCompra(undefined)} />
      )}
    </main>
  )
}
