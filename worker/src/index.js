const CSV_HEADER = 'date,C,V,F,T,opening,final,platos,fiscal';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DB_KEY = 'data.csv';

const PLATOS_CSV_HEADER = 'nombre,categoria,ultimaFecha,ultimoPrecio';
const PLATOS_DB_KEY = 'platos.csv';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Password',
    'Access-Control-Max-Age': '86400',
  };
}

function json(env, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

function checkPassword(request, env) {
  const pw = request.headers.get('X-App-Password') || '';
  return pw === env.WRITE_PASSWORD;
}

function isPositiveNumber(n) {
  return typeof n === 'number' && isFinite(n) && n > 0;
}

function validateRecord(r) {
  if (!r || typeof r !== 'object') return false;
  if (typeof r.dateISO !== 'string' || !DATE_RE.test(r.dateISO)) return false;
  if (!isPositiveNumber(r.C) || !isPositiveNumber(r.V) || !isPositiveNumber(r.F) || !isPositiveNumber(r.T)) return false;
  if (!isPositiveNumber(r.opening)) return false;
  // final may legitimately be 0 or negative (net loss), so only require a finite number
  if (typeof r.final !== 'number' || !isFinite(r.final)) return false;
  if (!Number.isInteger(r.platos) || r.platos <= 0 || r.platos > 500) return false;
  if (!isPositiveNumber(r.fiscal)) return false;
  return true;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  lines.shift(); // header
  return lines.map((line) => {
    const [date, C, V, F, T, opening, final, platos, fiscal] = line.split(',');
    return { date, C, V, F, T, opening, final, platos, fiscal };
  });
}

function serializeCSV(rows) {
  const lines = rows.map((r) =>
    [r.date, r.C, r.V, r.F, r.T, r.opening, r.final, r.platos, r.fiscal].join(',')
  );
  return [CSV_HEADER, ...lines].join('\n') + '\n';
}

// nombre is free text (dish + side) and may contain commas, so plato rows use
// quoted-CSV instead of the plain split(',') the ledger rows use above.
function csvEscapeField(value) {
  const s = String(value);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function parseCSVLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      fields.push(field);
      field = '';
    } else {
      field += c;
    }
  }
  fields.push(field);
  return fields;
}

function validatePlato(p) {
  if (!p || typeof p !== 'object') return false;
  if (typeof p.nombre !== 'string' || p.nombre.trim().length === 0) return false;
  if (typeof p.categoria !== 'string' || p.categoria.trim().length === 0) return false;
  if (typeof p.ultimaFecha !== 'string' || !DATE_RE.test(p.ultimaFecha)) return false;
  if (!isPositiveNumber(p.ultimoPrecio)) return false;
  return true;
}

function parsePlatosCSV(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  lines.shift(); // header
  return lines.map((line) => {
    const [nombre, categoria, ultimaFecha, ultimoPrecio] = parseCSVLine(line);
    return { nombre, categoria, ultimaFecha, ultimoPrecio };
  });
}

function serializePlatosCSV(rows) {
  const lines = rows.map((r) =>
    [csvEscapeField(r.nombre), csvEscapeField(r.categoria), r.ultimaFecha, r.ultimoPrecio].join(',')
  );
  return [PLATOS_CSV_HEADER, ...lines].join('\n') + '\n';
}

async function handleGetData(request, env) {
  if (!checkPassword(request, env)) {
    return json(env, 401, { ok: false, error: 'bad_password' });
  }
  const csv = (await env.DB.get(DB_KEY)) ?? (CSV_HEADER + '\n');
  return json(env, 200, { ok: true, csv });
}

async function handleSave(request, env) {
  if (!checkPassword(request, env)) {
    return json(env, 401, { ok: false, error: 'bad_password' });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json(env, 400, { ok: false, error: 'bad_json' });
  }

  if (!validateRecord(body.record)) {
    return json(env, 400, { ok: false, error: 'invalid_record' });
  }
  const r = body.record;

  const currentCsv = (await env.DB.get(DB_KEY)) ?? (CSV_HEADER + '\n');
  let rows = parseCSV(currentCsv);
  rows = rows.filter((row) => row.date !== r.dateISO);
  rows.push({
    date: r.dateISO,
    C: r.C, V: r.V, F: r.F, T: r.T,
    opening: r.opening,
    final: r.final,
    platos: r.platos,
    fiscal: r.fiscal,
  });
  rows.sort((a, b) => a.date.localeCompare(b.date));
  const newCsv = serializeCSV(rows);

  await env.DB.put(DB_KEY, newCsv);

  return json(env, 200, { ok: true });
}

async function handleGetPlatos(request, env) {
  if (!checkPassword(request, env)) {
    return json(env, 401, { ok: false, error: 'bad_password' });
  }
  const csv = (await env.DB.get(PLATOS_DB_KEY)) ?? (PLATOS_CSV_HEADER + '\n');
  return json(env, 200, { ok: true, csv });
}

async function handleSavePlato(request, env) {
  if (!checkPassword(request, env)) {
    return json(env, 401, { ok: false, error: 'bad_password' });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json(env, 400, { ok: false, error: 'bad_json' });
  }

  if (!validatePlato(body.plato)) {
    return json(env, 400, { ok: false, error: 'invalid_plato' });
  }
  const p = body.plato;

  const currentCsv = (await env.DB.get(PLATOS_DB_KEY)) ?? (PLATOS_CSV_HEADER + '\n');
  let rows = parsePlatosCSV(currentCsv);
  rows = rows.filter((row) => row.nombre !== p.nombre);
  rows.push({ nombre: p.nombre, categoria: p.categoria, ultimaFecha: p.ultimaFecha, ultimoPrecio: p.ultimoPrecio });
  rows.sort((a, b) => a.nombre.localeCompare(b.nombre));
  const newCsv = serializePlatosCSV(rows);

  await env.DB.put(PLATOS_DB_KEY, newCsv);

  return json(env, 200, { ok: true });
}

async function handleDeletePlato(request, env) {
  if (!checkPassword(request, env)) {
    return json(env, 401, { ok: false, error: 'bad_password' });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json(env, 400, { ok: false, error: 'bad_json' });
  }

  if (typeof body.nombre !== 'string' || body.nombre.trim().length === 0) {
    return json(env, 400, { ok: false, error: 'invalid_nombre' });
  }

  const currentCsv = (await env.DB.get(PLATOS_DB_KEY)) ?? (PLATOS_CSV_HEADER + '\n');
  let rows = parsePlatosCSV(currentCsv);
  rows = rows.filter((row) => row.nombre !== body.nombre);
  const newCsv = serializePlatosCSV(rows);

  await env.DB.put(PLATOS_DB_KEY, newCsv);

  return json(env, 200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (url.pathname === '/api/data' && request.method === 'GET') {
      return handleGetData(request, env);
    }

    if (url.pathname === '/api/save' && request.method === 'POST') {
      return handleSave(request, env);
    }

    if (url.pathname === '/api/platos' && request.method === 'GET') {
      return handleGetPlatos(request, env);
    }

    if (url.pathname === '/api/platos/save' && request.method === 'POST') {
      return handleSavePlato(request, env);
    }

    if (url.pathname === '/api/platos/delete' && request.method === 'POST') {
      return handleDeletePlato(request, env);
    }

    const knownPaths = ['/api/data', '/api/save', '/api/platos', '/api/platos/save', '/api/platos/delete'];
    if (!knownPaths.includes(url.pathname)) {
      return json(env, 404, { ok: false, error: 'not_found' });
    }

    return json(env, 405, { ok: false, error: 'method_not_allowed' });
  },
};
