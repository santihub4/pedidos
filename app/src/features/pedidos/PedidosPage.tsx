import { useMemo, useState } from 'react'
import { plata, fecha } from '../../lib/format'
import { usePedidos, useCambiarEstado, resumenItems, type Pedido } from './api'
import { Capas } from './Capas'
import { PedidoSheet } from './PedidoSheet'
import { ESTADOS, colorEstado, siguiente, type Estado } from './estados'

const ACTIVOS = ['Pendiente', 'Impreso', 'Listo para retirar']

export function PedidosPage() {
  const { data: pedidos, isLoading, error } = usePedidos()
  const cambiar = useCambiarEstado()
  const [texto, setTexto] = useState('')
  const [filtro, setFiltro] = useState<'activos' | Estado | 'todos'>('activos')
  // undefined = cerrado, null = pedido nuevo
  const [abierto, setAbierto] = useState<Pedido | null | undefined>(undefined)
  const clientes = useMemo(() => [...new Set((pedidos ?? []).map((p) => p.cliente))].sort(), [pedidos])

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase()
    return (pedidos ?? []).filter((p) => {
      const okEstado = filtro === 'todos' || (filtro === 'activos' ? ACTIVOS.includes(p.estado) : p.estado === filtro)
      const okTexto = !q || p.cliente.toLowerCase().includes(q) ||
        p.pedido_items.some((i) => i.descripcion.toLowerCase().includes(q))
      return okEstado && okTexto
    })
  }, [pedidos, texto, filtro])

  const activos = (pedidos ?? []).filter((p) => ACTIVOS.includes(p.estado))
  const porCobrar = activos.reduce((s, p) => s + (p.precio_final ?? 0), 0)

  return (
    <main className="contenido">
      <header className="cabecera">
        <h1 className="titulo">Pedidos</h1>
        <button className="btn btn-primario" onClick={() => setAbierto(null)}>+ Nuevo pedido</button>
      </header>

      <div className="resumen num">
        <span><b>{activos.length}</b>en curso</span>
        <span><b>{plata(porCobrar)}</b>por cobrar</span>
      </div>

      <input
        className="buscar"
        type="search"
        placeholder="Buscar cliente o producto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      <div className="chips" role="group" aria-label="Filtrar por estado">
        {(['activos', ...ESTADOS, 'todos'] as const).map((f) => (
          <button key={f} className="chip" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
            {f === 'activos' ? 'En curso' : f === 'todos' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {isLoading && <p className="vacio">Cargando pedidos…</p>}
      {error && <p className="vacio error">No se pudieron cargar los pedidos. Revisá la conexión y recargá.</p>}

      {pedidos && (visibles.length === 0 ? (
        <p className="vacio">
          {filtro === 'activos' && !texto ? 'No tenés pedidos en curso.' : 'Ningún pedido coincide con la búsqueda.'}
        </p>
      ) : (
        <ul className="lista">
          {visibles.map((p) => {
            const prox = siguiente(p.estado)
            return (
              <li key={p.id} className="pedido">
                <Capas
                  estado={p.estado}
                  ocupado={cambiar.isPending}
                  onAvanzar={prox ? () => cambiar.mutate({ id: p.id, estado: prox }) : undefined}
                />
                <button className="pedido-abrir" onClick={() => setAbierto(p)} aria-label={`Editar pedido de ${p.cliente}`}>
                  <span>
                    <span className="pedido-cliente">{p.cliente}</span>
                    <span className="pedido-detalle">{resumenItems(p)} · {fecha(p.fecha)}</span>
                  </span>
                  <span>
                    <span className="pedido-total num">{plata(p.precio_final)}</span>
                    <span className="pedido-estado" style={{ color: colorEstado[p.estado as Estado] }}>{p.estado}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ))}

      {abierto !== undefined && (
        <PedidoSheet key={abierto?.id ?? 'nuevo'} pedido={abierto} clientes={clientes} onCerrar={() => setAbierto(undefined)} />
      )}
    </main>
  )
}
