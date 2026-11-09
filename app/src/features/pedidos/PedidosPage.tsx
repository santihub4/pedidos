import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { plata, fecha } from '../../lib/format'
import { etiquetaMes } from '../gastos/api'
import { usePedidos, useCambiarEstado, resumenItems, saldo, type Pedido } from './api'
import { Capas } from './Capas'
import { PedidoSheet } from './PedidoSheet'
import { ESTADOS, colorEstado, siguiente, type Estado } from './estados'

const ACTIVOS = ['Pendiente', 'Impreso', 'Listo para retirar']

export function PedidosPage() {
  const { data: pedidos, isLoading, error } = usePedidos()
  const cambiar = useCambiarEstado()
  // Los filtros viven en la dirección, así Resumen puede abrir "Entregados de octubre".
  const [params, setParams] = useSearchParams()
  const texto = params.get('q') ?? ''
  const filtro = (params.get('estado') ?? 'activos') as 'activos' | Estado | 'todos'
  const mes = params.get('mes') ?? ''
  const cambiarFiltro = (cambios: Record<string, string>) => setParams((p) => {
    const n = new URLSearchParams(p)
    for (const [k, v] of Object.entries(cambios)) v ? n.set(k, v) : n.delete(k)
    return n
  }, { replace: true })
  const setTexto = (q: string) => cambiarFiltro({ q })
  const setFiltro = (estado: string) => cambiarFiltro({ estado: estado === 'activos' ? '' : estado })
  // undefined = cerrado, null = pedido nuevo
  const [abierto, setAbierto] = useState<Pedido | null | undefined>(undefined)
  const clientes = useMemo(() => [...new Set((pedidos ?? []).map((p) => p.cliente))].sort(), [pedidos])
  const meses = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of pedidos ?? []) { const k = (p.fecha ?? '').slice(0, 7); if (k) m.set(k, (m.get(k) ?? 0) + 1) }
    return [...m.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [pedidos])

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase()
    return (pedidos ?? []).filter((p) => {
      const okEstado = filtro === 'todos' || (filtro === 'activos' ? ACTIVOS.includes(p.estado) : p.estado === filtro)
      const okMes = !mes || (p.fecha ?? '').startsWith(mes)
      const okTexto = !q || p.cliente.toLowerCase().includes(q) ||
        p.pedido_items.some((i) => i.descripcion.toLowerCase().includes(q))
      return okEstado && okMes && okTexto
    })
  }, [pedidos, texto, filtro, mes])
  const totalVisibles = visibles.reduce((s, p) => s + (p.precio_final ?? 0), 0)

  const activos = (pedidos ?? []).filter((p) => ACTIVOS.includes(p.estado))
  const porCobrar = activos.reduce((s, p) => s + saldo(p), 0)

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

      <div className="filtros">
        <input
          className="buscar"
          type="search"
          placeholder="Buscar cliente o producto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <select
          className="buscar filtro-mes"
          aria-label="Mes"
          value={mes}
          onChange={(e) => cambiarFiltro({ mes: e.target.value, estado: e.target.value && filtro === 'activos' ? 'todos' : params.get('estado') ?? '' })}
        >
          <option value="">Todos los meses</option>
          {meses.map(([k, n]) => <option key={k} value={k}>{etiquetaMes(k)} ({n})</option>)}
        </select>
      </div>

      <div className="chips" role="group" aria-label="Filtrar por estado">
        {(['activos', ...ESTADOS, 'todos'] as const).map((f) => (
          <button key={f} className="chip" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
            {f === 'activos' ? 'En curso' : f === 'todos' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {(mes || texto) && visibles.length > 0 && (
        <p className="ayuda num total-filtro">
          {visibles.length} {visibles.length === 1 ? 'pedido' : 'pedidos'} · {plata(totalVisibles)}
          {' '}<button type="button" className="link" onClick={() => cambiarFiltro({ q: '', mes: '', estado: '' })}>Quitar filtros</button>
        </p>
      )}

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
                    {p.sena_pagada && ACTIVOS.includes(p.estado) && (
                      <span className="pedido-detalle num">Seña {plata(Number(p.sena_monto ?? 0))} · falta {plata(saldo(p))}</span>
                    )}
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
