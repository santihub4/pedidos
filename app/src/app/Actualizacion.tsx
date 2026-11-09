import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Avisos de la app instalada: versión nueva y falta de conexión. */
export function Actualizacion() {
  const { needRefresh: [hayNueva], updateServiceWorker } = useRegisterSW()
  const [conectado, setConectado] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setConectado(true)
    const off = () => setConectado(false)
    addEventListener('online', on)
    addEventListener('offline', off)
    return () => { removeEventListener('online', on); removeEventListener('offline', off) }
  }, [])

  if (hayNueva) {
    return (
      <div className="aviso" role="status">
        <span>Hay una versión nueva de la app.</span>
        <button className="btn btn-primario" onClick={() => updateServiceWorker(true)}>Actualizar</button>
      </div>
    )
  }
  if (!conectado) {
    return <div className="aviso" role="status">Sin conexión: ves lo último que cargaste y no se pueden guardar cambios.</div>
  }
  return null
}
