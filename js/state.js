let view = 'menu'; // 'menu' | 'cierre' | 'facturacion'

let facturacionMonth = null;

let lastScreenKey = null;

function groupByMonth() {
  const map = {};
  db.forEach(r => {
    const ym = r.dateISO.slice(0, 7);
    (map[ym] = map[ym] || []).push(r);
  });
  return map;
}

let db = [];

let platosDb = [];

let platoForm = null;

let platosViewState = null;

function freshPlatosViewState() {
  return { search: '', confirmDelete: null, deleting: false, error: '' };
}

const PLATO_CATEGORIAS = ['Carne', 'Pollo', 'Cerdo', 'Pescado', 'Pasta', 'Arroz', 'Ensalada', 'Guarnición', 'Postre', 'Bebida', 'Tartas'];

function freshPlatoForm() {
  return { nombre: '', categoria: '', ultimoPrecio: '', editingNombre: null, error: '', saving: false };
}

let menuBuilderState = null;

function freshMenuBuilderState() {
  return {
    text: '', search: '', categoriaFilter: '', confirmingNew: null, pendingUpdates: null, error: '', saving: false, success: false,
    postresModalOpen: false, selectedPostres: new Set(), postresWorking: null, lastPostresLine: '',
    tartasModalOpen: false, selectedTartas: new Set(), tartasWorking: null, lastTartasLine: '',
  };
}

function findPlatoByName(nombre) {
  const norm = normalizeName(nombre);
  return platosDb.find(p => normalizeName(p.nombre) === norm);
}

const STEPS = ['C', 'V', 'F', 'T', 'opening', 'platos', 'fiscal'];

const META = {
  C:       { label: 'C - Efectivo',       op: '',  kind: 'money' },
  V:       { label: 'V - Visa/Tarjeta',   op: '+', kind: 'money' },
  F:       { label: 'F - Fabian',         op: '+', kind: 'money' },
  T:       { label: 'T - Total Gastos',   op: '+', kind: 'money' },
  opening: { label: 'Apertura',           op: '−', kind: 'opening' },
  platos:  { label: 'Platos',             op: '',  kind: 'platos' },
  fiscal:  { label: 'Fiscal',             op: '',  kind: 'money' },
};

let state = null;

function freshState() {
  return {
    dateISO: isoToday(),
    values: { C: null, V: null, F: null, T: null, opening: null, platos: null, fiscal: null },
    openingSource: null,
    activeIndex: 0,
    error: '',
    saved: false,
    saving: false,
  };
}

state = freshState();

const dateBarEl = document.getElementById('dateBar');

const stepperEl = document.getElementById('stepper');

const appEl = document.getElementById('app');

const fitWrapEl = document.getElementById('fitWrap');

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const WEEKDAY_LABELS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/* ---------- Distribución de los módulos del dashboard ----------
   El panel es una grilla de 12 columnas por filas de alto fijo, y cada módulo
   declara en qué celda arranca y cuántas ocupa. Guardar la posición y no sólo
   el orden es lo que permite dejar huecos a propósito: nadie se corre para
   rellenarlos. Es una preferencia visual de quien mira la pantalla, no un dato
   del negocio: vive en el navegador y nunca viaja al Worker. */
const DASHBOARD_LAYOUT_KEY = 'lospumas_dashboard_layout';

// Clave de la versión anterior, cuando el panel era sólo una lista ordenada.
// Se lee una única vez para migrar y después queda muerta.
const DASHBOARD_ORDER_KEY = 'lospumas_dashboard_order';

const GRID_COLS = 12;

const GRID_ROW_PX = 44;

// Filas vacías de más mientras se edita: sin ellas no habría dónde soltar un
// módulo abajo de todo.
const GRID_SPARE_ROWS = 4;

const GRID_MAX_ROWS = 60;

const DASHBOARD_LAYOUT_DEFAULT = {
  'kpi-ventas':     { x: 0, y: 0,  w: 3,  h: 2 },
  'kpi-ticket':     { x: 3, y: 0,  w: 3,  h: 2 },
  'kpi-platos':     { x: 6, y: 0,  w: 3,  h: 2 },
  'kpi-fiscal':     { x: 9, y: 0,  w: 3,  h: 2 },
  'widget-sales':   { x: 0, y: 2,  w: 8,  h: 6 },
  'widget-actions': { x: 8, y: 2,  w: 4,  h: 6 },
  'widget-weekday': { x: 0, y: 8,  w: 6,  h: 5 },
  'widget-split':   { x: 6, y: 8,  w: 6,  h: 5 },
  'widget-clima':   { x: 0, y: 13, w: 12, h: 5 },
  'widget-recent':  { x: 0, y: 18, w: 12, h: 6 },
};

function clampInt(n, lo, hi) {
  const v = Math.round(Number(n));
  if (!isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function cloneLayout(layout) {
  const out = {};
  Object.keys(layout).forEach(id => { out[id] = { ...layout[id] }; });
  return out;
}

// Primera fila libre debajo de todo lo colocado.
function layoutBottom(layout) {
  let bottom = 0;
  Object.keys(layout).forEach(id => {
    const b = layout[id];
    if (b.y + b.h > bottom) bottom = b.y + b.h;
  });
  return bottom;
}

// Acomoda una lista de módulos de izquierda a derecha, bajando de renglón
// cuando el siguiente no entra. Sirve para migrar el orden viejo y para
// ubicar módulos que aparecen en una versión nueva de la app.
function layoutFromOrder(order) {
  const layout = {};
  let x = 0, rowTop = 0, rowH = 0;
  order.forEach(id => {
    const d = DASHBOARD_LAYOUT_DEFAULT[id];
    if (!d) return;
    if (x + d.w > GRID_COLS) { rowTop += rowH; x = 0; rowH = 0; }
    layout[id] = { x, y: rowTop, w: d.w, h: d.h };
    x += d.w;
    if (d.h > rowH) rowH = d.h;
  });
  return layout;
}

function loadDashboardLayout() {
  let saved = null;
  try {
    const raw = localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {}

  if (!saved || typeof saved !== 'object') {
    let order = null;
    try {
      const raw = localStorage.getItem(DASHBOARD_ORDER_KEY);
      if (raw) order = JSON.parse(raw);
    } catch (e) {}
    if (Array.isArray(order) && order.length) {
      const migrated = layoutFromOrder(order.filter(id => DASHBOARD_LAYOUT_DEFAULT[id]));
      // Un orden viejo podía no nombrar todos los módulos actuales.
      Object.keys(DASHBOARD_LAYOUT_DEFAULT).forEach(id => {
        if (!migrated[id]) migrated[id] = { ...DASHBOARD_LAYOUT_DEFAULT[id], x: 0, y: layoutBottom(migrated) };
      });
      return migrated;
    }
    return cloneLayout(DASHBOARD_LAYOUT_DEFAULT);
  }

  // Todo lo que viene de localStorage se recorta a valores posibles: un layout
  // corrupto tiene que degradar a algo usable, no romper el panel.
  const layout = {};
  Object.keys(DASHBOARD_LAYOUT_DEFAULT).forEach(id => {
    const s = saved[id];
    if (!s || typeof s !== 'object') return;
    const w = clampInt(s.w, 1, GRID_COLS);
    const h = clampInt(s.h, 1, GRID_MAX_ROWS);
    layout[id] = {
      x: clampInt(s.x, 0, GRID_COLS - w),
      y: clampInt(s.y, 0, GRID_MAX_ROWS - h),
      w, h,
    };
  });
  // Los módulos que falten (nuevos, o guardados en mal estado) van abajo.
  Object.keys(DASHBOARD_LAYOUT_DEFAULT).forEach(id => {
    if (layout[id]) return;
    const d = DASHBOARD_LAYOUT_DEFAULT[id];
    layout[id] = { x: 0, y: layoutBottom(layout), w: d.w, h: d.h };
  });
  return layout;
}

function saveDashboardLayout() {
  try { localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(dashboardLayout)); } catch (e) {}
}

let dashboardLayout = loadDashboardLayout();

let dashboardEditing = false;

// Copia previa a entrar en edición, para poder cancelar sin guardar.
let dashboardLayoutBackup = null;

let autoAdvanceTimer = null;
