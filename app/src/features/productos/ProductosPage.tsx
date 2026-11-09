import { useMemo, useState } from 'react'
import { plata } from '../../lib/format'
import { costoProducto } from '../../lib/pricing'
import { useCostos } from '../costos/api'
import { useCategorias, useProductos, type Producto } from './api'
import { ProductoSheet } from './ProductoSheet'
import { CategoriasSheet } from './CategoriasSheet'

const multi = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

export function ProductosPage() {
  const { data: productos, isLoading, error } = useProductos()
  const { data: categorias = [] } = useCategorias()
  const costos = useCostos()
  const [texto, setTexto] = useState('')
  const [cat, setCat] = useState<number | 'todas' | 'sin'>('todas')
  const [abierto, setAbierto] = useState<Producto | null | undefined>(undefined)
  const [verCategorias, setVerCategorias] = useState(false)

  const nombreCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias])
  const cuenta = useMemo(() => {
    const m = new Map<number | null, number>()
    for (const p of productos ?? []) m.set(p.categoria_id, (m.get(p.categoria_id) ?? 0) + 1)
    return m
  }, [productos])

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase()
    return (productos ?? []).filter((p) => {
      const okCat = cat === 'todas' || (cat === 'sin' ? p.categoria_id === null : p.categoria_id === cat)
      return okCat && (!q || p.nombre.toLowerCase().includes(q))
    })
  }, [productos, texto, cat])

  return (
    <main className="contenido">
      <header className="cabecera">
        <h1 className="titulo">Productos</h1>
        <div className="cabecera-acciones">
          <button className="btn" onClick={() => setVerCategorias(true)}>Categorías</button>
          <button className="btn btn-primario" onClick={() => setAbierto(null)}>+ Nuevo</button>
        </div>
      </header>

      <input className="buscar" type="search" placeholder="Buscar producto" value={texto} onChange={(e) => setTexto(e.target.value)} />

      <div className="chips" role="group" aria-label="Filtrar por categoría">
        <button className="chip" aria-pressed={cat === 'todas'} onClick={() => setCat('todas')}>Todas</button>
        {categorias.map((c) => (
          <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            {c.nombre} <span className="chip-n">{cuenta.get(c.id) ?? 0}</span>
          </button>
        ))}
        {(cuenta.get(null) ?? 0) > 0 && (
          <button className="chip" aria-pressed={cat === 'sin'} onClick={() => setCat('sin')}>
            Sin categoría <span className="chip-n">{cuenta.get(null)}</span>
          </button>
        )}
      </div>

      {isLoading && <p className="vacio">Cargando productos…</p>}
      {error && <p className="vacio error">No se pudieron cargar los productos. Revisá la conexión y recargá.</p>}

      {productos && (visibles.length === 0 ? (
        <p className="vacio">{productos.length ? 'Ningún producto coincide con la búsqueda.' : 'Todavía no cargaste productos.'}</p>
      ) : (
        <ul className="lista">
          {visibles.map((p) => {
            const costo = costos ? costoProducto(p, costos.cfg, costos.precioKg) : null
            const precio = Number(p.precio_base ?? 0)
            const x = costo && precio ? precio / costo : null
            const bajo = x !== null && costos !== null && x < costos.cfg.multiplicador
            const datos = [
              p.categoria_id ? nombreCat.get(p.categoria_id) : null,
              p.gramos ? `${Number(p.gramos).toLocaleString('es-AR')} g` : null,
              p.tiempo_horas ? `${Number(p.tiempo_horas).toLocaleString('es-AR')} h` : null,
            ].filter(Boolean)
            return (
              <li key={p.id}>
                <button className="fila-abrir" onClick={() => setAbierto(p)}>
                  <span>
                    <span className="pedido-cliente">{p.nombre}</span>
                    <span className="pedido-detalle">{datos.join(' · ') || 'Sin datos de impresión'}</span>
                  </span>
                  <span>
                    <span className="pedido-total num">{precio ? plata(precio) : '—'}</span>
                    {costo !== null && (
                      <span className={'producto-costo num' + (bajo ? ' bajo' : '')}>
                        costo {plata(costo)}{x ? ` · ×${multi.format(x)}` : ''}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ))}

      {abierto !== undefined && (
        <ProductoSheet key={abierto?.id ?? 'nuevo'} producto={abierto} categorias={categorias} onCerrar={() => setAbierto(undefined)} />
      )}
      {verCategorias && <CategoriasSheet categorias={categorias} cuenta={cuenta} onCerrar={() => setVerCategorias(false)} />}
    </main>
  )
}
