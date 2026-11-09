import { NavLink, Outlet } from 'react-router-dom'

const items = [
  { a: '/pedidos', texto: 'Pedidos', icono: <path d="M4 7h16M4 12h16M4 17h10" /> },
  { a: '/productos', texto: 'Productos', icono: <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Zm0 0v18M4 7.5l8 4.5 8-4.5" /> },
  { a: '/calculadora', texto: 'Calculadora', icono: <path d="M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" /> },
  { a: '/gastos', texto: 'Gastos', icono: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 6h6M9 13h6" /> },
  { a: '/resumen', texto: 'Resumen', icono: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
]

export function Shell() {
  return (
    <div className="app">
      <nav className="barra" aria-label="Secciones">
        {items.map((i) => (
          <NavLink key={i.a} to={i.a} className={({ isActive }) => (isActive ? 'activo' : '')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {i.icono}
            </svg>
            {i.texto}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
