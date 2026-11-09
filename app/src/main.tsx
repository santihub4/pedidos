import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/tokens.css'
import './styles/base.css'
import { useSession } from './auth/useSession'
import { LoginPage } from './auth/LoginPage'
import { Shell } from './app/Shell'
import { Actualizacion } from './app/Actualizacion'
import { PedidosPage } from './features/pedidos/PedidosPage'
import { ProductosPage } from './features/productos/ProductosPage'
import { CalculadoraPage } from './features/calculadora/CalculadoraPage'
import { GastosPage } from './features/gastos/GastosPage'
import { ResumenPage } from './features/resumen/ResumenPage'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

// Solo en desarrollo: ?demo muestra la app con datos inventados, sin login.
const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has('demo')
if (DEMO) {
  const estados = ['Pendiente', 'Impreso', 'Listo para retirar', 'Entregado', 'Cancelado', 'Pendiente', 'Entregado']
  const nombres = ['Maceta geométrica', 'Soporte auriculares', 'Engranaje', 'Llavero', 'Figura', 'Organizador', 'Cartel']
  queryClient.setQueryDefaults(['pedidos'], { staleTime: Infinity })
  queryClient.setQueryDefaults(['productos'], { staleTime: Infinity })
  queryClient.setQueryData(['productos', 'para-pedido'], nombres.map((nombre, i) => ({ id: i + 1, nombre, precio_base: 3000 + i * 1000 })))
  queryClient.setQueryDefaults(['categorias'], { staleTime: Infinity })
  queryClient.setQueryDefaults(['calculadora'], { staleTime: Infinity })
  queryClient.setQueryDefaults(['filamentos'], { staleTime: Infinity })
  queryClient.setQueryData(['categorias'], [{ id: 1, nombre: 'Hogar', user_id: 'demo', created_at: null }, { id: 2, nombre: 'Juguetes', user_id: 'demo', created_at: null }])
  queryClient.setQueryData(['calculadora'], { filamento: 20000, kwh: 140, consumo: 120, vida: 4320, repuestos: 150000, error: 5, multiplicador: 4, empaque: 300 })
  queryClient.setQueryData(['filamentos'], [
    { id: 1, kg: 1, precio: 22000, fecha: '2026-11-01', marca: 'Grilon', color: 'Negro', user_id: 'demo', created_at: null },
    { id: 2, kg: 2, precio: 41000, fecha: '2026-10-12', marca: 'Printalot', color: 'Blanco', user_id: 'demo', created_at: null },
  ])
  queryClient.setQueryDefaults(['gastos'], { staleTime: Infinity })
  queryClient.setQueryData(['gastos'], [
    { id: 1, concepto: 'Boquillas 0.4', categoria: 'Repuestos', monto: 8000, cantidad: 5, unidad: 'unidad', fecha: '2026-11-03', descripcion: null, user_id: 'demo', created_at: null, tipo: 'general', marca: null, kilos: null, colores: null, precio_por_kg: null },
    { id: 2, concepto: 'Cajas de envío', categoria: 'Packaging', monto: 12500, cantidad: 50, unidad: 'unidad', fecha: '2026-10-20', descripcion: null, user_id: 'demo', created_at: null, tipo: 'general', marca: null, kilos: null, colores: null, precio_por_kg: null },
  ])
  queryClient.setQueryData(['productos', 'lista'], nombres.map((nombre, i) => ({
    id: i + 1, nombre, precio_base: [12000, 9000, 4200, 1500, 18000, 8000, 30000][i], categoria_id: i % 3 === 2 ? null : (i % 2) + 1,
    categoria: null, gramos: [120, 80, 30, 8, 200, 150, null][i], tiempo_horas: [6, 4, 1.5, 0.5, 10, 7, null][i],
    descripcion: null, created_at: null, user_id: 'demo',
  })))
  queryClient.setQueryData(['pedidos'], estados.map((estado, i) => ({
    id: 100 - i, user_id: 'demo', cliente: ['Lucía', 'Martín', 'Taller Rojas', 'Sofía', 'Diego', 'Ana', 'Pablo'][i],
    producto: nombres[i], cantidad: [1, 2, 10, 25, 1, 3, 1][i], precio_unitario: 5000,
    precio_final: [5000, 9000, 42000, 25000, 18000, 15000, 30000][i],
    estado, descripcion: null, fecha: ['2026-11-01', '2026-11-02', '2026-11-03', '2026-10-04', '2026-10-05', '2026-09-06', '2026-11-07'][i],
    pedido_items: [
      { id: i * 10, pedido_id: 100 - i, producto_id: i + 1, descripcion: nombres[i], cantidad: [1, 2, 10, 25, 1, 3, 1][i], precio_unitario: 5000, subtotal: null, user_id: 'demo', created_at: '', gramos: i === 6 ? 500 : null, horas: i === 6 ? 12 : null },
      ...(i === 2 ? [{ id: 99, pedido_id: 98, producto_id: 2, descripcion: 'Soporte auriculares', cantidad: 2, precio_unitario: 4500, subtotal: null, user_id: 'demo', created_at: '' }] : []),
    ],
  })))
}

function App() {
  const session = useSession()
  if (!DEMO) {
    if (session === undefined) return null
    if (!session) return <LoginPage />
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/calculadora" element={<CalculadoraPage />} />
          <Route path="/gastos" element={<GastosPage />} />
          <Route path="/resumen" element={<ResumenPage />} />
          <Route path="*" element={<Navigate to="/pedidos" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Actualizacion />
    </QueryClientProvider>
  </StrictMode>,
)
