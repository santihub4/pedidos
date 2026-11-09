import { useState } from 'react'
import { Hoja } from '../../app/Hoja'
import { plata } from '../../lib/format'
import { desglose } from '../../lib/pricing'
import { useCostos } from '../costos/api'
import { mensajeError, useBorrarProducto, useGuardarProducto, type Categoria, type Producto, type ProductoForm } from './api'

type Props = { producto: Producto | null; categorias: Categoria[]; onCerrar: () => void }

const num = (v: string) => (v === '' ? null : Number(v))

export function ProductoSheet({ producto, categorias, onCerrar }: Props) {
  const costos = useCostos()
  const guardar = useGuardarProducto()
  const borrar = useBorrarProducto()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ProductoForm>(() => ({
    nombre: producto?.nombre ?? '',
    categoria_id: producto?.categoria_id ?? null,
    precio_base: Number(producto?.precio_base ?? 0),
    gramos: producto?.gramos ?? null,
    tiempo_horas: producto?.tiempo_horas ?? null,
    descripcion: producto?.descripcion ?? '',
  }))
  const set = <K extends keyof ProductoForm>(k: K, v: ProductoForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const tieneDatos = Boolean(form.gramos || form.tiempo_horas)
  const calc = costos && tieneDatos
    ? desglose({ gramos: form.gramos ?? 0, horas: form.tiempo_horas ?? 0 }, costos.cfg, costos.precioKg)
    : null
  const sugerido = calc && costos ? Math.ceil((calc.costo * costos.cfg.multiplicador) / 100) * 100 : null

  async function enviar(cerrar: () => void) {
    setError(null)
    if (!form.nombre.trim()) return setError('Falta el nombre del producto.')
    const categoriaNombre = categorias.find((c) => c.id === form.categoria_id)?.nombre ?? ''
    try {
      await guardar.mutateAsync({ id: producto?.id ?? null, form: { ...form, nombre: form.nombre.trim() }, categoriaNombre })
      cerrar()
    } catch (e) {
      setError(mensajeError(e, 'guardar el producto'))
    }
  }

  async function eliminar(cerrar: () => void) {
    if (!producto || !confirm(`¿Borrar "${producto.nombre}"? Los pedidos que lo tienen lo conservan como texto.`)) return
    try {
      await borrar.mutateAsync(producto.id)
      cerrar()
    } catch (e) {
      setError(mensajeError(e, 'borrar el producto'))
    }
  }

  const ocupado = guardar.isPending || borrar.isPending

  return (
    <Hoja titulo={producto ? 'Editar producto' : 'Nuevo producto'} onCerrar={onCerrar} onSubmit={enviar}>
      {(cerrar) => {
        return (
          <>
            <label className="campo">
              <span>Nombre</span>
              <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
            </label>

            <label className="campo">
              <span>Categoría</span>
              <select value={form.categoria_id ?? ''} onChange={(e) => set('categoria_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>

            <div className="fila-2">
              <label className="campo">
                <span>Gramos</span>
                <input className="num" type="number" inputMode="decimal" min={0} step="any"
                  value={form.gramos ?? ''} onChange={(e) => set('gramos', num(e.target.value))} />
              </label>
              <label className="campo">
                <span>Horas de impresión</span>
                <input className="num" type="number" inputMode="decimal" min={0} step="any"
                  value={form.tiempo_horas ?? ''} onChange={(e) => set('tiempo_horas', num(e.target.value))} />
              </label>
            </div>

            {calc && (
              <div className="costo-caja num">
                <div className="costo-linea"><span>Material</span><span>{plata(calc.material)}</span></div>
                <div className="costo-linea"><span>Luz</span><span>{plata(calc.luz)}</span></div>
                <div className="costo-linea"><span>Desgaste</span><span>{plata(calc.desgaste)}</span></div>
                <div className="costo-linea"><span>Margen por fallas</span><span>{plata(calc.error)}</span></div>
                <div className="costo-linea costo-total"><span>Costo</span><span>{plata(calc.costo)}</span></div>
                {sugerido && (
                  <div className="costo-linea">
                    <span>Sugerido (×{costos!.cfg.multiplicador})</span>
                    <button type="button" className="link" onClick={() => set('precio_base', sugerido)}>usar {plata(sugerido)}</button>
                  </div>
                )}
              </div>
            )}

            <label className="campo campo-total">
              <span>Precio de venta</span>
              <input className="num" type="number" inputMode="decimal" min={0} step="any"
                value={form.precio_base || ''} onChange={(e) => set('precio_base', Number(e.target.value))} />
            </label>

            <label className="campo">
              <span>Notas</span>
              <textarea rows={2} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
            </label>

            {error && <p className="error" role="alert">{error}</p>}

            <footer className="hoja-acciones">
              {producto && <button type="button" className="btn btn-peligro" onClick={() => eliminar(cerrar)} disabled={ocupado}>Borrar</button>}
              <button type="submit" className="btn btn-primario" disabled={ocupado}>
                {guardar.isPending ? 'Guardando…' : 'Guardar producto'}
              </button>
            </footer>
          </>
        )
      }}
    </Hoja>
  )
}
