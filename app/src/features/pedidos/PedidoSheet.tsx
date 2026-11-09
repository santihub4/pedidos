import { useEffect, useMemo, useRef, useState } from 'react'
import { plata } from '../../lib/format'
import {
  useBorrarPedido, useGuardarPedido, useProductosParaPedido,
  type ItemForm, type Pedido, type PedidoForm,
} from './api'
import { ESTADOS } from './estados'

type Props = { pedido: Pedido | null; clientes: string[]; onCerrar: () => void }

const hoy = () => new Date().toISOString().slice(0, 10)
const itemVacio = (): ItemForm => ({ producto_id: null, descripcion: '', cantidad: 1, precio_unitario: 0 })

function formInicial(p: Pedido | null): PedidoForm {
  if (!p) {
    return { cliente: '', fecha: hoy(), estado: 'Pendiente', descripcion: '', precio_final: 0, sena_pagada: true, sena_monto: 0, items: [itemVacio()] }
  }
  return {
    cliente: p.cliente,
    fecha: p.fecha ?? hoy(),
    estado: p.estado,
    descripcion: p.descripcion ?? '',
    precio_final: Number(p.precio_final ?? 0),
    // Los pedidos de antes de la seña quedan sin seña.
    sena_pagada: p.sena_pagada ?? false,
    sena_monto: Number(p.sena_monto ?? 0),
    items: p.pedido_items.length
      ? p.pedido_items.map((i) => ({ producto_id: i.producto_id, descripcion: i.descripcion, cantidad: i.cantidad, precio_unitario: Number(i.precio_unitario) }))
      : [itemVacio()],
  }
}

/** Formulario de pedido que sube desde abajo. pedido null = nuevo. */
export function PedidoSheet({ pedido, clientes, onCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const { data: productos = [] } = useProductosParaPedido()
  const guardar = useGuardarPedido()
  const borrar = useBorrarPedido()
  const [form, setForm] = useState<PedidoForm>(() => formInicial(pedido))
  // Mientras no toques el total, sigue a la suma de los productos.
  const [totalManual, setTotalManual] = useState(() => {
    if (!pedido) return false
    const suma = pedido.pedido_items.reduce((s, i) => s + i.cantidad * Number(i.precio_unitario), 0)
    return Math.abs(suma - Number(pedido.precio_final ?? 0)) > 0.01
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { dialogo.current?.showModal() }, [])

  // La seña sigue al 50% del total hasta que la escribas a mano.
  const [senaManual, setSenaManual] = useState(() => Boolean(pedido?.sena_pagada))

  const suma = useMemo(() => form.items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0), [form.items])
  const total = totalManual ? form.precio_final : suma
  const sena = form.sena_pagada ? (senaManual ? form.sena_monto : Math.round(total / 2)) : 0
  const porNombre = useMemo(() => new Map(productos.map((p) => [p.nombre.toLowerCase(), p])), [productos])

  const set = <K extends keyof PedidoForm>(k: K, v: PedidoForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  function setItem(i: number, cambio: Partial<ItemForm>) {
    setForm((f) => ({ ...f, items: f.items.map((it, j) => (j === i ? { ...it, ...cambio } : it)) }))
  }

  function elegirProducto(i: number, texto: string) {
    const p = porNombre.get(texto.trim().toLowerCase())
    if (p) setItem(i, { descripcion: p.nombre, producto_id: p.id, precio_unitario: Number(p.precio_base ?? 0) })
    else setItem(i, { descripcion: texto, producto_id: null })
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const items = form.items
      .map((i) => ({ ...i, descripcion: i.descripcion.trim() }))
      .filter((i) => i.descripcion)
    if (!form.cliente.trim()) return setError('Falta el nombre del cliente.')
    if (!items.length) return setError('Agregá al menos un producto.')
    if (items.some((i) => i.cantidad < 1)) return setError('La cantidad tiene que ser 1 o más.')
    if (sena > total) return setError('La seña no puede ser mayor que el total.')
    try {
      await guardar.mutateAsync({
        id: pedido?.id ?? null,
        form: { ...form, cliente: form.cliente.trim(), items, precio_final: total, sena_monto: sena },
      })
      cerrar()
    } catch {
      setError('No se pudo guardar el pedido. Revisá la conexión y probá de nuevo.')
    }
  }

  async function eliminar() {
    if (!pedido || !confirm(`¿Borrar el pedido de ${pedido.cliente}? No se puede deshacer.`)) return
    try {
      await borrar.mutateAsync(pedido.id)
      cerrar()
    } catch {
      setError('No se pudo borrar el pedido.')
    }
  }

  function cerrar() {
    dialogo.current?.close()
  }

  const ocupado = guardar.isPending || borrar.isPending

  return (
    <dialog ref={dialogo} className="hoja" onClose={onCerrar} onClick={(e) => e.target === dialogo.current && cerrar()}>
      <form className="hoja-cuerpo" onSubmit={enviar}>
        <header className="hoja-cabecera">
          <h2>{pedido ? 'Editar pedido' : 'Nuevo pedido'}</h2>
          <button type="button" className="btn-icono" onClick={cerrar} aria-label="Cerrar">✕</button>
        </header>

        <label className="campo">
          <span>Cliente</span>
          <input list="lista-clientes" value={form.cliente} onChange={(e) => set('cliente', e.target.value)} autoComplete="off" required />
          <datalist id="lista-clientes">{clientes.map((c) => <option key={c} value={c} />)}</datalist>
        </label>

        <div className="fila-2">
          <label className="campo">
            <span>Fecha</span>
            <input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
          </label>
          <label className="campo">
            <span>Estado</span>
            <select value={form.estado} onChange={(e) => set('estado', e.target.value)}>
              {ESTADOS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <fieldset className="items">
          <legend>Productos</legend>
          <datalist id="lista-productos">{productos.map((p) => <option key={p.id} value={p.nombre} />)}</datalist>
          {form.items.map((it, i) => (
            <div key={i} className="item">
              <input
                className="item-nombre"
                list="lista-productos"
                placeholder="Producto"
                aria-label={`Producto ${i + 1}`}
                value={it.descripcion}
                onChange={(e) => elegirProducto(i, e.target.value)}
                autoComplete="off"
              />
              <input
                className="item-cant num" type="number" inputMode="numeric" min={1}
                aria-label={`Cantidad del producto ${i + 1}`}
                value={it.cantidad} onChange={(e) => setItem(i, { cantidad: Number(e.target.value) })}
              />
              <span className="item-x" aria-hidden="true">×</span>
              <input
                className="item-precio num" type="number" inputMode="decimal" min={0} step="any"
                aria-label={`Precio unitario del producto ${i + 1}`}
                placeholder="Precio"
                value={it.precio_unitario || ''} onChange={(e) => setItem(i, { precio_unitario: Number(e.target.value) })}
              />
              <span className="item-subtotal num">{plata(it.cantidad * it.precio_unitario)}</span>
              <button
                type="button" className="btn-icono" aria-label={`Quitar producto ${i + 1}`}
                disabled={form.items.length === 1}
                onClick={() => set('items', form.items.filter((_, j) => j !== i))}
              >−</button>
            </div>
          ))}
          <button type="button" className="btn btn-linea" onClick={() => set('items', [...form.items, itemVacio()])}>
            + Agregar producto
          </button>
        </fieldset>

        <label className="campo campo-total">
          <span>Total {totalManual ? <button type="button" className="link" onClick={() => setTotalManual(false)}>usar suma ({plata(suma)})</button> : <small>(suma de los productos)</small>}</span>
          <input
            className="num" type="number" inputMode="decimal" min={0} step="any"
            value={total}
            onChange={(e) => { setTotalManual(true); set('precio_final', Number(e.target.value)) }}
          />
        </label>

        <div className="sena">
          <label className="sena-check">
            <input type="checkbox" checked={form.sena_pagada} onChange={(e) => set('sena_pagada', e.target.checked)} />
            <span>Seña pagada</span>
          </label>
          {form.sena_pagada && (
            <input
              className="num" type="number" inputMode="decimal" min={0} step="any" aria-label="Monto de la seña"
              value={sena || ''}
              onChange={(e) => { setSenaManual(true); set('sena_monto', Number(e.target.value)) }}
            />
          )}
          <span className="sena-falta num">Falta {plata(Math.max(total - sena, 0))}</span>
        </div>

        <label className="campo">
          <span>Notas</span>
          <textarea rows={2} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <footer className="hoja-acciones">
          {pedido && <button type="button" className="btn btn-peligro" onClick={eliminar} disabled={ocupado}>Borrar</button>}
          <button type="submit" className="btn btn-primario" disabled={ocupado}>
            {guardar.isPending ? 'Guardando…' : 'Guardar pedido'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
