const CSV_HEADER = 'date,C,V,F,T,opening,final,platos,fiscal';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(env, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
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

function b64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64DecodeUtf8(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
}

async function githubRequest(env, path, options = {}) {
  const url = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'los-pumas-worker',
      ...(options.headers || {}),
    },
  });
}

async function handleSave(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json(env, 400, { ok: false, error: 'bad_json' });
  }

  if (typeof body.password !== 'string' || body.password !== env.WRITE_PASSWORD) {
    return json(env, 401, { ok: false, error: 'bad_password' });
  }

  if (!validateRecord(body.record)) {
    return json(env, 400, { ok: false, error: 'invalid_record' });
  }
  const r = body.record;

  const getRes = await githubRequest(env, `/contents/data.csv?ref=${env.REPO_BRANCH}`);
  if (!getRes.ok) {
    return json(env, 502, { ok: false, error: 'github_get_failed', detail: await getRes.text() });
  }
  const getData = await getRes.json();
  const currentCsv = b64DecodeUtf8(getData.content);
  const sha = getData.sha;

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

  const putRes = await githubRequest(env, '/contents/data.csv', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Cierre ${r.dateISO}`,
      content: b64EncodeUtf8(newCsv),
      sha,
      branch: env.REPO_BRANCH,
    }),
  });
  if (!putRes.ok) {
    return json(env, 502, { ok: false, error: 'github_put_failed', detail: await putRes.text() });
  }

  return json(env, 200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (url.pathname === '/api/save' && request.method === 'POST') {
      return handleSave(request, env);
    }

    if (url.pathname !== '/api/save') {
      return json(env, 404, { ok: false, error: 'not_found' });
    }

    return json(env, 405, { ok: false, error: 'method_not_allowed' });
  },
};
