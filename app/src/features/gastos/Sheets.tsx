import { useState } from 'react'
import { Hoja } from '../../app/Hoja'
import { plata } from '../../lib/format'
import { useCompraMut, useGastoMut, type Compra, type CompraForm, type Gasto, type GastoForm } from './api'

const hoy = () => new Date().toISOString().slice(0, 10)

type Acciones = { guardando: boolean; ocupado: boolean; puedeBorrar: boolean; onBorrar: () => void; texto: string; error: string | null }

function Pie({ guardando, ocupado, puedeBorrar, onBorrar, texto, error }: Acciones) {
  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}
      <footer className="hoja-acciones">
        {puedeBorrar && <button type="button" className="btn btn-peligro" onClick={onBorrar} disabled={ocupado}>Borrar</button>}
        <button type="submit" className="btn btn-primario" disabled={ocupado}>{guardando ? 'Guardando…' : texto}</button>
      </footer>
    </>
  )
}

export function GastoSheet({ gasto, conceptos, categorias, onCerrar }: { gasto: Gasto | null; conceptos: string[]; categorias: string[]; onCerrar: () => void }) {
  const { guardar, borrar } = useGastoMut()
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState<GastoForm>(() => ({
    concepto: gasto?.concepto ?? '', categoria: gasto?.categoria ?? '', monto: Number(gasto?.monto ?? 0),
    cantidad: Number(gasto?.cantidad ?? 1), unidad: gasto?.unidad ?? 'unidad', fecha: gasto?.fecha ?? hoy(), descripcion: gasto?.descripcion ?? '',
  }))
  const set = <K extends keyof GastoForm>(k: K, v: GastoForm[K]) => setF((x) => ({ ...x, [k]: v }))

  async function enviar(cerrar: () => void) {
    setError(null)
    if (!f.concepto.trim()) return setError('Falta el concepto.')
    if (!(f.monto >= 0)) return setError('El monto no es válido.')
    try {
      await guardar.mutateAsync({ id: gasto?.id ?? null, form: { ...f, concepto: f.concepto.trim(), categoria: f.categoria.trim() } })
      cerrar()
    } catch { setError('No se pudo guardar el gasto. Probá de nuevo.') }
  }

  async function eliminar(cerrar: () => void) {
    if (!gasto || !confirm(`¿Borrar "${gasto.concepto}"?`)) return
    try { await borrar.mutateAsync(gasto.id); cerrar() } catch { setError('No se pudo borrar el gasto.') }
  }

  return (
    <Hoja titulo={gasto ? 'Editar gasto' : 'Nuevo gasto'} onCerrar={onCerrar} onSubmit={enviar}>
      {(cerrar) => (
        <>
          <label className="campo">
            <span>Concepto</span>
            <input list="lista-conceptos" value={f.concepto} onChange={(e) => set('concepto', e.target.value)} autoComplete="off" required />
            <datalist id="lista-conceptos">{conceptos.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <div className="fila-2">
            <label className="campo campo-total">
              <span>Monto</span>
              <input className="num" type="number" inputMode="decimal" min={0} step="any" value={f.monto || ''} onChange={(e) => set('monto', Number(e.target.value))} required />
            </label>
            <label className="campo">
              <span>Fecha</span>
              <input type="date" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />
            </label>
          </div>
          <label className="campo">
            <span>Categoría</span>
            <input list="lista-cat-gastos" value={f.categoria} onChange={(e) => set('categoria', e.target.value)} autoComplete="off" />
            <datalist id="lista-cat-gastos">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <div className="fila-2">
            <label className="campo">
              <span>Cantidad</span>
              <input className="num" type="number" inputMode="decimal" min={0} step="any" value={f.cantidad || ''} onChange={(e) => set('cantidad', Number(e.target.value))} />
            </label>
            <label className="campo">
              <span>Unidad</span>
              <input value={f.unidad} onChange={(e) => set('unidad', e.target.value)} />
            </label>
          </div>
          <label className="campo">
            <span>Notas</span>
            <textarea rows={2} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
          </label>
          <Pie texto="Guardar gasto" error={error} guardando={guardar.isPending} ocupado={guardar.isPending || borrar.isPending}
            puedeBorrar={Boolean(gasto)} onBorrar={() => eliminar(cerrar)} />
        </>
      )}
    </Hoja>
  )
}

export function CompraSheet({ compra, marcas, onCerrar }: { compra: Compra | null; marcas: string[]; onCerrar: () => void }) {
  const { guardar, borrar } = useCompraMut()
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState<CompraForm>(() => ({
    marca: compra?.marca ?? '', color: compra?.color ?? '', kg: Number(compra?.kg ?? 1), precio: Number(compra?.precio ?? 0), fecha: compra?.fecha ?? hoy(),
  }))
  const set = <K extends keyof CompraForm>(k: K, v: CompraForm[K]) => setF((x) => ({ ...x, [k]: v }))

  async function enviar(cerrar: () => void) {
    setError(null)
    if (!f.marca.trim()) return setError('Falta la marca.')
    if (!(f.kg > 0)) return setError('Los kilos tienen que ser más de 0.')
    try {
      await guardar.mutateAsync({ id: compra?.id ?? null, form: { ...f, marca: f.marca.trim(), color: f.color.trim() } })
      cerrar()
    } catch { setError('No se pudo guardar la compra. Probá de nuevo.') }
  }

  async function eliminar(cerrar: () => void) {
    if (!compra || !confirm('¿Borrar esta compra de filamento?')) return
    try { await borrar.mutateAsync(compra.id); cerrar() } catch { setError('No se pudo borrar la compra.') }
  }

  return (
    <Hoja titulo={compra ? 'Editar compra' : 'Nueva compra de filamento'} onCerrar={onCerrar} onSubmit={enviar}>
      {(cerrar) => (
        <>
          <div className="fila-2">
            <label className="campo">
              <span>Marca</span>
              <input list="lista-marcas" value={f.marca} onChange={(e) => set('marca', e.target.value)} autoComplete="off" required />
              <datalist id="lista-marcas">{marcas.map((m) => <option key={m} value={m} />)}</datalist>
            </label>
            <label className="campo">
              <span>Color</span>
              <input value={f.color} onChange={(e) => set('color', e.target.value)} />
            </label>
          </div>
          <div className="fila-2">
            <label className="campo">
              <span>Kilos</span>
              <input className="num" type="number" inputMode="decimal" min={0} step="any" value={f.kg || ''} onChange={(e) => set('kg', Number(e.target.value))} required />
            </label>
            <label className="campo campo-total">
              <span>Precio total</span>
              <input className="num" type="number" inputMode="decimal" min={0} step="any" value={f.precio || ''} onChange={(e) => set('precio', Number(e.target.value))} required />
            </label>
          </div>
          {f.kg > 0 && f.precio > 0 && <p className="ayuda num">Sale {plata(f.precio / f.kg)} por kg.</p>}
          <label className="campo">
            <span>Fecha</span>
            <input type="date" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />
          </label>
          <Pie texto="Guardar compra" error={error} guardando={guardar.isPending} ocupado={guardar.isPending || borrar.isPending}
            puedeBorrar={Boolean(compra)} onBorrar={() => eliminar(cerrar)} />
        </>
      )}
    </Hoja>
  )
}
