const WORKER_BASE = 'https://los-pumas-worker.los-pumas-cafe.workers.dev';

const SESSION_STORAGE_KEY = 'lospumas_session_token';

let sessionToken = localStorage.getItem(SESSION_STORAGE_KEY) || '';

let authStatus = 'gate'; // 'gate' | 'checking' | 'resuming' | 'ready'

let authError = '';

let rememberMe = true;

function storeSessionToken(token, remember) {
  sessionToken = token;
  try {
    if (remember) localStorage.setItem(SESSION_STORAGE_KEY, token);
    else localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {}
}

function clearSessionToken() {
  sessionToken = '';
  try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch (e) {}
}

async function login(password, remember) {
  const res = await fetch(WORKER_BASE + '/api/login', {
    method: 'POST',
    headers: { 'X-App-Password': password },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const err = new Error(data.error || ('HTTP ' + res.status));
    err.code = data.error;
    throw err;
  }
  storeSessionToken(data.token, remember);
}

async function fetchData() {
  const res = await fetch(WORKER_BASE + '/api/data', {
    headers: { 'X-Session-Token': sessionToken },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const err = new Error(data.error || ('HTTP ' + res.status));
    err.code = data.error;
    throw err;
  }
  return parseCSV(data.csv);
}

async function fetchPlatos() {
  const res = await fetch(WORKER_BASE + '/api/platos', {
    headers: { 'X-Session-Token': sessionToken },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const err = new Error(data.error || ('HTTP ' + res.status));
    err.code = data.error;
    throw err;
  }
  return parsePlatosCSV(data.csv);
}
