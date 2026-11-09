import { useState } from 'react'
import { entrarConGoogle } from './useSession'

export function LoginPage() {
  const [error, setError] = useState<string | null>(null)

  async function entrar() {
    setError(null)
    const { error } = await entrarConGoogle()
    if (error) setError('No se pudo abrir el login de Google. Probá de nuevo.')
  }

  return (
    <main className="login">
      <div className="login-marca">
        <Capas />
        <h1>Pedidos 3D</h1>
      </div>
      <p className="login-sub">Pedidos, costos y gastos de tus impresiones.</p>
      <button className="btn btn-primario btn-grande" onClick={entrar}>
        Entrar con Google
      </button>
      {error && <p className="error">{error}</p>}
    </main>
  )
}

function Capas() {
  return (
    <svg className="login-capas" viewBox="0 0 48 48" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={8 + i * 2} y={38 - i * 7} width={32 - i * 4} height={5} rx={1.5} />
      ))}
    </svg>
  )
}
