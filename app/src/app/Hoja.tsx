import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  titulo: string
  onCerrar: () => void
  onSubmit?: (cerrar: () => void) => void
  children: (cerrar: () => void) => ReactNode
}

/** Panel que sube desde abajo en el celular y aparece centrado en la compu. */
export function Hoja({ titulo, onCerrar, onSubmit, children }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialogo.current?.showModal() }, [])
  const cerrar = () => dialogo.current?.close()

  return (
    <dialog ref={dialogo} className="hoja" onClose={onCerrar} onClick={(e) => e.target === dialogo.current && cerrar()}>
      <form className="hoja-cuerpo" onSubmit={(e) => { e.preventDefault(); onSubmit?.(cerrar) }}>
        <header className="hoja-cabecera">
          <h2>{titulo}</h2>
          <button type="button" className="btn-icono" onClick={cerrar} aria-label="Cerrar">✕</button>
        </header>
        {children(cerrar)}
      </form>
    </dialog>
  )
}
