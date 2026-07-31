const CSV_HEADER = 'date,C,V,F,T,opening,final,platos,fiscal';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DB_KEY = 'data.csv';

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

    if (url.pathname !== '/api/data' && url.pathname !== '/api/save') {
      return json(env, 404, { ok: false, error: 'not_found' });
    }

    return json(env, 405, { ok: false, error: 'method_not_allowed' });
  },
};
