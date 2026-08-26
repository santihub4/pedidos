const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('C:/Users/santino/Downloads/claudecodehtmlversino/index (3).html', 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

function fakeEl(id) {
  const el = {
    id, innerHTML: '', textContent: '', value: '', className: '', disabled: false, checked: false,
    placeholder: '', type: '',
    style: new Proxy({}, { get: () => '', set: () => true }),
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, removeChild() {}, remove() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; }, closest() { return null; },
    focus() {}, click() {}, dataset: {},
    parentElement: { clientWidth: 800 },
  };
  return el;
}
const els = {};
const documentStub = {
  getElementById: (id) => (els[id] ||= fakeEl(id)),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  createElement: (t) => fakeEl(t),
  body: fakeEl('body'),
  title: 'test',
};
const supabaseStub = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange() {},
    signInWithOAuth: async () => ({ error: null }),
    setSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => {},
  },
  createClient: () => supabaseStub,
};

const sandbox = {
  console,
  document: documentStub,
  window: { location: { origin: 'http://x', pathname: '/', hash: '' }, addEventListener() {}, supabase: supabaseStub },
  supabase: supabaseStub,
  location: { origin: 'http://x', pathname: '/' },
  history: { replaceState() {} },
  lucide: { createIcons() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  confirm: () => true,
  alert: (m) => { console.log('ALERT:', m); },
  setTimeout: (fn) => 1,
  clearTimeout() {},
  setInterval: () => 1,
  clearInterval() {},
  requestAnimationFrame: (fn) => fn(),
  URL, URLSearchParams, Blob, Date, JSON, Math, Number, String, Boolean, Array, Object, Set, Promise, Function,
  parseFloat, parseInt, isNaN, fetch: async () => { throw new Error('no fetch en test'); },
};
sandbox.window.document = documentStub;
vm.createContext(sandbox);

const testHarness = `
;globalThis.__t = {};
__t.setDatos = (p, g, f, prod, est) => { pedidos = p; gastos = g; filamentos = f; productos = prod; estadisticasCustom = est; };
__t.run = (name, fn) => {
  try { fn(); console.log('OK  ', name); }
  catch (e) { console.log('FAIL', name, '->', e.message); globalThis.__fallos = (globalThis.__fallos || 0) + 1; }
};
__t.fns = { renderDashboard, renderEstadisticas, renderGastos, renderTabla, renderProductos, renderCategorias, renderFilamentos, calcularPrecio, valoresStats, evaluarTokens, renderCustomStats, renderDropdownProductos, renderDashConfig, renderStatsConfig, calcularCostoProduccion, obtenerPromedioKg, renderFormulaDisplay, actualizarPreviewEst, insertarToken, limpiarFormula, aplicarDatosCalculadora };
`;

try {
  new vm.Script(script + testHarness, { filename: 'app.js' }).runInContext(sandbox, { timeout: 5000 });
  console.log('Script ejecutado sin errores de carga');
} catch (e) {
  console.log('ERROR AL EJECUTAR SCRIPT:', e.message);
  process.exit(1);
}

const r = sandbox.__t;
const hoy = new Date();
const mes = (i) => { const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 15); return d.toISOString().split('T')[0]; };
r.setDatos(
  [
    { id: 1, cliente: 'Ana', producto: 'Soporte', cantidad: 2, precio_unitario: 500, precio_final: 1000, estado: 'Entregado', fecha: mes(0), descripcion: '' },
    { id: 2, cliente: 'Beto', producto: 'Florero', cantidad: 1, precio_unitario: 2000, precio_final: 2000, estado: 'Pendiente', fecha: mes(1), descripcion: 'x' },
    { id: 3, cliente: 'Ana', producto: 'Soporte', cantidad: 1, precio_unitario: 500, precio_final: 500, estado: 'Impreso', fecha: mes(2), descripcion: '' },
    { id: 4, cliente: 'Cami', producto: 'Maceta', cantidad: 3, precio_unitario: 800, precio_final: 2400, estado: 'Entregado', fecha: mes(5), descripcion: '' },
    { id: 5, cliente: 'Dani', producto: 'Florero', cantidad: 1, precio_unitario: 2000, precio_final: 2000, estado: 'Cancelado', fecha: mes(0), descripcion: '' },
  ],
  [{ id: 1, concepto: 'Luz', categoria: 'Servicios', monto: 5000, cantidad: 1, unidad: 'mes', fecha: mes(0), descripcion: '' }],
  [{ id: 1, marca: 'Grilon3', color: 'Negro', kg: 1, precio: 20000, fecha: mes(0) }, { id: 2, marca: 'BQ', color: 'Blanco', kg: 3, precio: 45000, fecha: mes(1) }],
  [
    { id: 1, nombre: 'Soporte', categoria: 'Hogar', precio_base: 1500, gramos: 50, tiempo_horas: 2, descripcion: '' },
    { id: 2, nombre: 'Florero', categoria: 'Decoracion', precio_base: 3000, gramos: 120, tiempo_horas: 5, descripcion: '' },
  ],
  [{ id: 1, nombre: 'Gastos totales', formula: [{ t: 'var', v: 'gastos' }, { t: 'op', v: '+' }, { t: 'var', v: 'gastos_filamento' }], vista: 'variable' },
   { id: 2, nombre: 'Ganancia mensual', formula: [{ t: 'var', v: 'ingresos_mensuales' }, { t: 'op', v: '-' }, { t: 'var', v: 'custom_1' }], vista: 'barras' }]
);

const F = r.fns;
r.run('renderDashboard', () => F.renderDashboard());
r.run('renderEstadisticas', () => F.renderEstadisticas());
r.run('renderGastos', () => F.renderGastos());
r.run('renderTabla', () => F.renderTabla());
r.run('renderTabla con filtro', () => { els['filtro-cliente'].value = 'ana'; F.renderTabla(); els['filtro-cliente'].value = ''; });
r.run('renderTabla orden caro', () => { els['filtro-orden'].value = 'caro'; F.renderTabla(); els['filtro-orden'].value = 'nuevo'; });
r.run('renderProductos', () => F.renderProductos());
r.run('renderProductos orden costo', () => { els['filtro-orden-productos'].value = 'costo_caro'; F.renderProductos(); els['filtro-orden-productos'].value = 'nuevo'; });
r.run('renderCategorias', () => F.renderCategorias());
r.run('renderFilamentos', () => F.renderFilamentos());
r.run('calcularPrecio', () => F.calcularPrecio());
r.run('renderDropdownProductos', () => F.renderDropdownProductos());
r.run('renderDashConfig', () => F.renderDashConfig());
r.run('renderStatsConfig', () => F.renderStatsConfig());
r.run('renderCustomStats', () => F.renderCustomStats());
r.run('costo produccion', () => { const c = F.calcularCostoProduccion({ gramos: 100, tiempo_horas: 1 }); if (!(c > 0)) throw new Error('costo=' + c); });
r.run('promedio kg', () => { const p = F.obtenerPromedioKg(); if (p !== 20000) throw new Error('prom=' + p); });
r.run('valoresStats ganancia', () => { const v = F.valoresStats(null); if (v.facturacion !== 3400) throw new Error('fact=' + v.facturacion); if (v.ganancia_neta !== 3400 - 5000 - 20000) throw new Error('gn=' + v.ganancia_neta); });
r.run('valoresStats custom var', () => { const v = F.valoresStats(null); if (v.custom_1 !== 25000) throw new Error('custom_1=' + v.custom_1); });
r.run('evaluarTokens formula custom', () => { const v = F.evaluarTokens([{ t: 'var', v: 'ingresos_mensuales' }, { t: 'op', v: '-' }, { t: 'var', v: 'custom_1' }], F.valoresStats(null)); if (v === null) throw new Error('null'); });
r.run('formula editor tokens', () => { F.limpiarFormula(); F.insertarToken({ t: 'op', v: '+' }); F.insertarToken({ t: 'var', v: 'facturacion' }); F.insertarToken({ t: 'op', v: '/' }); F.insertarToken({ t: 'op', v: ')' }); F.insertarToken({ t: 'op', v: '(' }); });
r.run('aplicarDatosCalculadora', () => F.aplicarDatosCalculadora({ filamento: 20000, kwh: 140, consumo: 120, vida: 4320, repuestos: 150000, error: 5, horas: 1, minutos: 30, gramos: 100, insumos: 0, multiplicador: 4 }));

console.log('Fallos totales:', globalThis.__fallos === undefined ? 0 : sandbox.__fallos || 0);
