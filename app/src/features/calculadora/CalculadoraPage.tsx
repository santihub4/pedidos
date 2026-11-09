import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { plata } from '../../lib/format'
import { desglose, precioKgPromedio, type CalcConfig } from '../../lib/pricing'
import { useComprasFilamento, useConfigCalculadora } from '../costos/api'
import { useGuardarProducto } from '../productos/api'

const CAMPOS_CONFIG: { k: keyof CalcConfig; label: string }[] = [
  { k: 'kwh', label: 'Luz ($/kWh)' },
  { k: 'consumo', label: 'Consumo de la impresora (W)' },
  { k: 'vida', label: 'Vida útil (horas)' },
  { k: 'repuestos', label: 'Repuestos en esa vida útil ($)' },
  { k: 'error', label: 'Margen por fallas (%)' },
]

type Pieza = { horas: number; minutos: number; gramos: number; insumos: number }

export function CalculadoraPage() {
  const { data: guardada } = useConfigCalculadora()
  const { data: compras = [] } = useComprasFilamento()
  const qc = useQueryClient()
  const [cfg, setCfg] = useState<CalcConfig | null>(null)
  const [pieza, setPieza] = useState<Pieza>({ horas: 0, minutos: 0, gramos: 0, insumos: 0 })
  const [aviso, setAviso] = useState<string | null>(null)
  const [verConfig, setVerConfig] = useState(false)

  useEffect(() => { if (guardada && !cfg) setCfg(guardada) }, [guardada, cfg])

  const guardar = useMutation({
    mutationFn: async (c: CalcConfig) => {
      const { error } = await supabase
        .from('configuracion_calculadora')
        .upsert({ configuracion: c, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calculadora'] }),
  })

  if (!cfg) return <main className="contenido"><h1 className="titulo">Calculadora</h1><p className="vacio">Cargando…</p></main>

  const horas = pieza.horas + pieza.minutos / 60
  // El filamento siempre sale del promedio de las compras de los últimos 3 meses.
  const promedio = precioKgPromedio(compras)
  const precioKg = promedio ?? cfg.filamento
  const d = desglose({ gramos: pieza.gramos, horas, insumos: pieza.insumos }, cfg, precioKg)
  const total = d.costo * Math.max(cfg.multiplicador || 1, 1)
  const cambiada = guardada && JSON.stringify(guardada) !== JSON.stringify(cfg)

  const setP = (k: keyof Pieza, v: string) => setPieza((p) => ({ ...p, [k]: Number(v) || 0 }))
  const setC = (k: keyof CalcConfig, v: string) => setCfg((c) => c && { ...c, [k]: Number(v) || 0 })

  async function guardarConfig() {
    setAviso(null)
    try {
      // Se guarda también el promedio actual, por si algún día no hay compras cargadas.
      const nuevo = { ...cfg!, filamento: Math.round(precioKg) }
      await guardar.mutateAsync(nuevo)
      setCfg(nuevo)
      setAviso('Configuración guardada.')
    } catch {
      setAviso('No se pudo guardar la configuración. Probá de nuevo.')
    }
  }

  return (
    <main className="contenido">
      <header className="cabecera">
        <h1 className="titulo">Calculadora</h1>
      </header>

      <div className="calc">
        <section className="calc-pieza" aria-label="Datos de la pieza">
          <div className="fila-2">
            <Num label="Horas" value={pieza.horas} onChange={(v) => setP('horas', v)} />
            <Num label="Minutos" value={pieza.minutos} onChange={(v) => setP('minutos', v)} />
          </div>
          <div className="fila-2">
            <Num label="Gramos" value={pieza.gramos} onChange={(v) => setP('gramos', v)} />
            <Num label="Insumos extra ($)" value={pieza.insumos} onChange={(v) => setP('insumos', v)} />
          </div>
          <Num label="Multiplicador de ganancia" value={cfg.multiplicador} onChange={(v) => setC('multiplicador', v)} />
          <p className="ayuda num">
            Filamento a {plata(precioKg)}/kg{' '}
            {promedio ? '(promedio de tus compras de los últimos 3 meses)' : '(no hay compras cargadas: se usa el último precio guardado)'}
          </p>
        </section>

        <section className="calc-resultado num" aria-label="Resultado" aria-live="polite">
          <div className="costo-linea"><span>Material</span><span>{plata(d.material)}</span></div>
          <div className="costo-linea"><span>Luz</span><span>{plata(d.luz)}</span></div>
          <div className="costo-linea"><span>Desgaste</span><span>{plata(d.desgaste)}</span></div>
          <div className="costo-linea"><span>Margen por fallas</span><span>{plata(d.error)}</span></div>
          <div className="costo-linea"><span>Insumos</span><span>{plata(d.insumos)}</span></div>
          <div className="costo-linea costo-total"><span>Costo</span><span>{plata(d.costo)}</span></div>
          <div className="calc-total">
            <span>A cobrar</span>
            <b>{plata(total)}</b>
          </div>
          <GuardarComoProducto gramos={pieza.gramos} horas={horas} precio={Math.ceil(total / 100) * 100} />
        </section>
      </div>

      <section className="calc-config">
        <button type="button" className="desplegable" aria-expanded={verConfig} onClick={() => setVerConfig((v) => !v)}>
          Costos fijos {cambiada && <span className="punto" aria-label="sin guardar" />}
        </button>
        {verConfig && (
          <div className="calc-config-cuerpo">
            <div className="grilla-config">
              {CAMPOS_CONFIG.map(({ k, label }) => <Num key={k} label={label} value={cfg[k]} onChange={(v) => setC(k, v)} />)}
            </div>
            <div className="hoja-acciones">
              <button type="button" className="btn btn-primario" onClick={guardarConfig} disabled={guardar.isPending || !cambiada}>
                {guardar.isPending ? 'Guardando…' : 'Guardar costos fijos'}
              </button>
            </div>
            {aviso && <p className="ayuda" role="status">{aviso}</p>}
          </div>
        )}
      </section>
    </main>
  )
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <label className="campo">
      <span>{label}</span>
      <input className="num" type="number" inputMode="decimal" min={0} step="any" value={value || ''} placeholder="0" onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function GuardarComoProducto({ gramos, horas, precio }: { gramos: number; horas: number; precio: number }) {
  const guardar = useGuardarProducto()
  const [nombre, setNombre] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  if (!gramos && !horas) return null
  if (!abierto) {
    return (
      <>
        <button type="button" className="btn btn-linea" onClick={() => { setAbierto(true); setAviso(null) }}>Guardar como producto</button>
        {aviso && <p className="ayuda" role="status">{aviso}</p>}
      </>
    )
  }

  async function crear() {
    if (!nombre.trim()) return
    try {
      await guardar.mutateAsync({
        id: null,
        form: { nombre: nombre.trim(), categoria_id: null, precio_base: precio, gramos, tiempo_horas: Math.round(horas * 100) / 100, descripcion: '' },
        categoriaNombre: '',
      })
      setAviso(`"${nombre.trim()}" quedó en Productos a ${plata(precio)}.`)
      setNombre('')
      setAbierto(false)
    } catch {
      setAviso('No se pudo guardar el producto. Puede que ya exista uno con ese nombre.')
    }
  }

  return (
    <>
      <div className="nueva-cat">
        <input autoFocus placeholder="Nombre del producto" aria-label="Nombre del producto" value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && crear()} />
        <button type="button" className="btn btn-primario" onClick={crear} disabled={!nombre.trim() || guardar.isPending}>Guardar</button>
      </div>
      {aviso && <p className="error" role="alert">{aviso}</p>}
    </>
  )
}
