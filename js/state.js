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

let autoAdvanceTimer = null;
