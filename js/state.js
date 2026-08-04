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

/* ---------- Orden de los módulos del dashboard ---------- */
// Es una preferencia visual de quien mira la pantalla, no un dato del negocio:
// vive en el navegador y nunca viaja al Worker.
const DASHBOARD_ORDER_KEY = 'lospumas_dashboard_order';

const DASHBOARD_ORDER_DEFAULT = [
  'kpi-ventas', 'kpi-ticket', 'kpi-platos', 'kpi-fiscal',
  'widget-sales', 'widget-actions', 'widget-weekday', 'widget-split', 'widget-recent',
];

// Ignora ids que ya no existen y agrega al final los módulos nuevos, así un
// orden guardado con una versión vieja de la app sigue sirviendo.
function loadDashboardOrder() {
  let saved = [];
  try {
    const raw = localStorage.getItem(DASHBOARD_ORDER_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {}
  if (!Array.isArray(saved)) saved = [];
  const known = new Set(DASHBOARD_ORDER_DEFAULT);
  const order = saved.filter(id => known.has(id));
  DASHBOARD_ORDER_DEFAULT.forEach(id => { if (!order.includes(id)) order.push(id); });
  return order;
}

function saveDashboardOrder() {
  try { localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(dashboardOrder)); } catch (e) {}
}

let dashboardOrder = loadDashboardOrder();

let dashboardEditing = false;

// Copia previa a entrar en edición, para poder cancelar sin guardar.
let dashboardOrderBackup = null;

let autoAdvanceTimer = null;
