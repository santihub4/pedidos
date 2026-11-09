import { useState } from 'react'
import { Hoja } from '../../app/Hoja'
import { mensajeError, useBorrarCategoria, useGuardarCategoria, type Categoria } from './api'

type Props = { categorias: Categoria[]; cuenta: Map<number | null, number>; onCerrar: () => void }

export function CategoriasSheet({ categorias, cuenta, onCerrar }: Props) {
  const guardar = useGuardarCategoria()
  const borrar = useBorrarCategoria()
  const [nueva, setNueva] = useState('')
  const [editando, setEditando] = useState<{ id: number; nombre: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function crear() {
    const nombre = nueva.trim()
    if (!nombre) return
    setError(null)
    try {
      await guardar.mutateAsync({ id: null, nombre })
      setNueva('')
    } catch (e) {
      setError(mensajeError(e, 'crear la categoría'))
    }
  }

  async function renombrar() {
    if (!editando || !editando.nombre.trim()) return
    setError(null)
    try {
      await guardar.mutateAsync({ id: editando.id, nombre: editando.nombre.trim() })
      setEditando(null)
    } catch (e) {
      setError(mensajeError(e, 'renombrar la categoría'))
    }
  }

  async function eliminar(c: Categoria) {
    const n = cuenta.get(c.id) ?? 0
    const aviso = n ? `¿Borrar "${c.nombre}"? Sus ${n} productos quedan sin categoría.` : `¿Borrar "${c.nombre}"?`
    if (!confirm(aviso)) return
    setError(null)
    try {
      await borrar.mutateAsync(c.id)
    } catch (e) {
      setError(mensajeError(e, 'borrar la categoría'))
    }
  }

  return (
    <Hoja titulo="Categorías" onCerrar={onCerrar} onSubmit={() => (editando ? renombrar() : crear())}>
      {() => (
        <>
          <div className="nueva-cat">
            <input
              placeholder="Nueva categoría" aria-label="Nombre de la nueva categoría"
              value={nueva} onChange={(e) => setNueva(e.target.value)}
              onFocus={() => setEditando(null)}
            />
            <button type="button" className="btn btn-primario" onClick={crear} disabled={!nueva.trim() || guardar.isPending}>Agregar</button>
          </div>

          <ul className="lista lista-cats">
            {categorias.map((c) => (
              <li key={c.id} className="cat">
                {editando?.id === c.id ? (
                  <>
                    <input
                      autoFocus aria-label={`Nuevo nombre para ${c.nombre}`}
                      value={editando.nombre} onChange={(e) => setEditando({ id: c.id, nombre: e.target.value })}
                    />
                    <button type="button" className="btn btn-primario" onClick={renombrar} disabled={guardar.isPending}>Guardar</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="cat-nombre" onClick={() => setEditando({ id: c.id, nombre: c.nombre })}>
                      {c.nombre} <span className="chip-n">{cuenta.get(c.id) ?? 0}</span>
                    </button>
                    <button type="button" className="btn-icono" aria-label={`Borrar ${c.nombre}`} onClick={() => eliminar(c)}>✕</button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="ayuda">Tocá una categoría para cambiarle el nombre.</p>
          {error && <p className="error" role="alert">{error}</p>}
        </>
      )}
    </Hoja>
  )
}
