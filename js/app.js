function screenKeyFor() {
  if (authStatus !== 'ready') return 'gate:' + authStatus;
  if (state.saved) return 'saved';
  return 'view:' + view;
}

function playScreenTransition() {
  [dateBarEl, stepperEl, appEl].forEach(el => {
    if (!el || !el.firstElementChild) return;
    el.classList.remove('screen-enter');
    void el.offsetWidth;
    el.classList.add('screen-enter');
  });
  const root = appEl.firstElementChild;
  if (root) {
    Array.from(root.children).forEach((child, i) => {
      child.classList.remove('stagger-child');
      child.style.animationDelay = (i * 0.13) + 's';
    });
    void root.offsetWidth;
    Array.from(root.children).forEach(child => child.classList.add('stagger-child'));
  }
}

/* ---------- Accesibilidad: anuncios, teclado y foco en modales ---------- */
const liveRegionEl = document.getElementById('liveRegion');

let lastAnnounced = '';

let lastOpenDialog = null;

let focusBeforeDialog = null;

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Los mensajes de error/éxito se re-crean con innerHTML en cada render, así que
// un aria-live puesto sobre ellos nunca se anunciaría. Los espejamos acá.
function syncLiveRegion() {
  const msg = Array.from(appEl.querySelectorAll('.error, .success'))
    .map(el => el.textContent.trim())
    .filter(Boolean)
    .join('. ');
  if (msg === lastAnnounced) return;
  lastAnnounced = msg;
  liveRegionEl.textContent = msg;
}

// Cada render reemplaza el DOM con innerHTML, así que el foco se pierde salvo
// que lo devolvamos a mano. Identificamos el elemento por id o por su data-*.
function focusKeyOf(el) {
  if (!el || el === document.body) return null;
  if (el.id) return '#' + CSS.escape(el.id);
  const d = el.dataset || {};
  const cls = el.classList[0] ? '.' + CSS.escape(el.classList[0]) : '';
  if (d.nombre) return `${cls}[data-nombre="${CSS.escape(d.nombre)}"]`;
  if (d.cat) return `${cls}[data-cat="${CSS.escape(d.cat)}"]`;
  if (d.ym) return `${cls}[data-ym="${CSS.escape(d.ym)}"]`;
  return null;
}

function restoreFocus(key) {
  if (!key) return;
  // Si el propio render ya movió el foco a propósito, no se lo sacamos.
  if (document.activeElement && document.activeElement !== document.body) return;
  const el = document.querySelector(key);
  if (el) el.focus();
}

function syncDialogFocus(previousFocusKey) {
  const dialog = appEl.querySelector('[role="dialog"]');
  const dialogId = dialog ? dialog.id : null;
  if (dialogId === lastOpenDialog) {
    restoreFocus(previousFocusKey);
    return;
  }
  if (dialog) {
    if (!lastOpenDialog) focusBeforeDialog = previousFocusKey;
    const first = dialog.querySelector(FOCUSABLE);
    if (first) first.focus();
  } else {
    restoreFocus(focusBeforeDialog || previousFocusKey);
    focusBeforeDialog = null;
  }
  lastOpenDialog = dialogId;
}

// Enter/Espacio sobre los elementos que actúan como botones pero son divs.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('[role="button"], [role="checkbox"], [role="option"], [role="tab"]');
  if (!el) return;
  e.preventDefault();
  el.click();
});

document.addEventListener('keydown', (e) => {
  const dialog = appEl.querySelector('[role="dialog"]');
  if (!dialog) return;
  if (e.key === 'Escape') {
    const dismiss = dialog.querySelector('[data-modal-dismiss]');
    if (dismiss && !dismiss.disabled) { e.preventDefault(); dismiss.click(); }
    return;
  }
  if (e.key !== 'Tab') return;
  const items = Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(el => !el.disabled);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

function renderAll() {
  const previousFocusKey = focusKeyOf(document.activeElement);
  renderScreen();
  syncLiveRegion();
  syncDialogFocus(previousFocusKey);
}

function renderScreen() {
  const screenKey = screenKeyFor();
  const screenChanged = screenKey !== lastScreenKey;
  lastScreenKey = screenKey;
  document.getElementById('logoutBtn').style.display = authStatus === 'ready' ? '' : 'none';
  if (authStatus === 'resuming') {
    dateBarEl.innerHTML = '';
    stepperEl.innerHTML = '';
    appEl.innerHTML = `<div class="card"><p class="gate-title">Cargando…</p></div>`;
    if (screenChanged) playScreenTransition();
    return;
  }
  if (authStatus !== 'ready') {
    dateBarEl.innerHTML = '';
    stepperEl.innerHTML = '';
    const checking = authStatus === 'checking';
    appEl.innerHTML = `
      <div class="card">
        <h2 class="gate-title">Fabian, ingresá la contraseña</h2>
        <label class="sr-only" for="gatePwInput">Contraseña</label>
        <input type="password" id="gatePwInput" class="pw-input" placeholder="Contraseña" autocomplete="current-password" ${checking ? 'disabled' : ''}>
        <label class="remember-me-label">
          <input type="checkbox" id="gateRememberInput" ${rememberMe ? 'checked' : ''} ${checking ? 'disabled' : ''}>
          Mantener sesión iniciada
        </label>
        <div class="error">${authError || ''}</div>
        <button id="gateBtn" ${checking ? 'disabled' : ''}>${checking ? 'Verificando…' : 'Acceder al sistema'}</button>
      </div>`;
    const gateInput = appEl.querySelector('#gatePwInput');
    const gateBtn = appEl.querySelector('#gateBtn');
    const gateRemember = appEl.querySelector('#gateRememberInput');
    gateRemember.onchange = () => { rememberMe = gateRemember.checked; };
    const submit = () => { if (!gateInput.value) return; submitPassword(gateInput.value, gateRemember.checked); };
    gateBtn.onclick = submit;
    gateInput.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    if (!checking) gateInput.focus();
    if (screenChanged) playScreenTransition();
    return;
  }
  fitWrapEl.classList.toggle('wide', view === 'facturacion' || view === 'platos');
  fitWrapEl.classList.toggle('menu-wide', view === 'menuBuilder');
  fitWrapEl.classList.toggle('dashboard', view === 'menu');
  if (view === 'menu') {
    renderMenu();
  } else if (view === 'facturacion') {
    renderFacturacionView();
  } else if (view === 'platos') {
    renderPlatosView();
  } else if (view === 'menuBuilder') {
    renderMenuBuilderView();
  } else {
    renderDateBar();
    renderStepper();
    renderApp();
  }
  if (screenChanged) playScreenTransition();
}

document.getElementById('menuBtn').onclick = () => { view = 'menu'; renderAll(); };

function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('lospumas_theme', theme); } catch (e) {}
  document.getElementById('themeToggleBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
}

applyTheme(currentTheme());

document.getElementById('themeToggleBtn').onclick = () => {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
};

async function submitPassword(pw, remember) {
  authStatus = 'checking';
  authError = '';
  renderAll();
  try {
    await login(pw, remember);
    [db, platosDb] = await Promise.all([fetchData(), fetchPlatos()]);
    authStatus = 'ready';
  } catch (e) {
    authStatus = 'gate';
    if (e.code === 'bad_password') authError = 'Contraseña incorrecta.';
    else if (e.code === 'too_many_attempts') authError = 'Demasiados intentos fallidos. Esperá unos minutos y volvé a intentar.';
    else authError = 'No se pudo conectar. Intentá de nuevo.';
    clearSessionToken();
  }
  renderAll();
}

function logout() {
  clearSessionToken();
  authStatus = 'gate';
  authError = '';
  db = null;
  platosDb = null;
  renderAll();
}

async function tryResumeSession() {
  if (!sessionToken) return;
  authStatus = 'resuming';
  renderAll();
  try {
    [db, platosDb] = await Promise.all([fetchData(), fetchPlatos()]);
    authStatus = 'ready';
  } catch (e) {
    authStatus = 'gate';
    clearSessionToken();
  }
  renderAll();
}

document.getElementById('logoutBtn').onclick = logout;

// En localhost, entra directo con la contraseña de worker/.dev.vars: solo
// funciona contra un `wrangler dev` local, así que no habilita nada en
// producción (esa contraseña no existe ahí).
const DEV_PASSWORD = 'dev-local';

async function boot() {
  renderAll();
  if (IS_LOCAL_DEV && !sessionToken) {
    try { await login(DEV_PASSWORD, true); } catch (e) {}
  }
  tryResumeSession();
}

boot();
