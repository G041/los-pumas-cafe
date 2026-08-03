function s3() { return (state.values.C||0) + (state.values.V||0) + (state.values.F||0); }

function s4() { return s3() + (state.values.T||0); }

function finalResult() { return s4() - (state.values.opening||0); }

function renderDateBar() {
  dateBarEl.innerHTML = `
    <span>Cerrando el día <strong>${toDisplayDate(state.dateISO)}</strong></span>
    <button class="date-picker-btn" type="button" id="openDatePicker">📅 Cambiar fecha</button>
    <input type="date" id="dateInput" class="hidden-date-input" value="${state.dateISO}" tabindex="-1" aria-label="Fecha del cierre">
  `;
  const dateInput = dateBarEl.querySelector('#dateInput');
  dateBarEl.querySelector('#openDatePicker').onclick = () => {
    if (dateInput.showPicker) {
      try { dateInput.showPicker(); return; } catch (e) {}
    }
    dateInput.focus();
    dateInput.click();
  };
  dateInput.onchange = (e) => {
    if (!e.target.value) return;
    state.dateISO = e.target.value;
    renderAll();
  };
}

function renderStepper() {
  const labels = { C: 'C', V: 'V', F: 'F', T: 'T', opening: 'Apertura', platos: 'Platos', fiscal: 'Fiscal' };
  stepperEl.innerHTML = `<ol class="stepper-list">` + STEPS.map((key, i) => {
    const done = i < state.activeIndex;
    const active = i === state.activeIndex && !state.saved;
    const cls = done ? 'done' : (active ? 'active' : '');
    const status = done ? 'completado' : (active ? 'paso actual' : 'pendiente');
    return `<li class="step-pill ${cls}" ${active ? 'aria-current="step"' : ''}>
      <span aria-hidden="true">${labels[key]}</span>
      <span class="sr-only">${META[key].label}: ${status}</span>
    </li>`;
  }).join('') + `</ol>`;
}

function cellContent(key, idx) {
  const meta = META[key];
  const committed = idx < state.activeIndex;
  const active = idx === state.activeIndex && !state.saved;

  if (committed) {
    if (key === 'platos') return `${state.values.platos}`;
    return fmt(state.values[key]) + (key === 'opening' && state.openingSource === 'auto' ? '<span class="note-inline">(automático, de ayer)</span>' : '');
  }

  if (!active) return '—';

  // active row rendering
  const aria = `aria-label="${meta.label}"`;
  if (key === 'opening') {
    if (isFirstOfMonth(state.dateISO)) {
      return `<input type="number" id="stepInput" step="any" min="0" placeholder="Apertura" ${aria}>`;
    }
    const prevIso = prevIsoDate(state.dateISO);
    const prevRecord = db.find(r => r.dateISO === prevIso);
    if (prevRecord) {
      state._autoOpening = prevRecord.s3;
      return `${fmt(prevRecord.s3)}<span class="note-inline">Automático, tomado de ayer (${toDisplayDate(prevIso)})</span>`;
    } else {
      state._autoOpening = null;
      return `<input type="number" id="stepInput" step="any" min="0" placeholder="Apertura" ${aria}>
        <span class="note-inline">No hay cierre de ayer guardado: ingresá manualmente.</span>`;
    }
  }
  if (key === 'platos') {
    return `<input type="number" id="stepInput" min="1" max="500" step="1" placeholder="Cantidad" ${aria}>`;
  }
  return `<input type="number" id="stepInput" step="any" min="0" placeholder="Monto" ${aria}>`;
}

function buildRows() {
  let rows = '';
  STEPS.forEach((key, idx) => {
    const meta = META[key];
    const locked = idx > state.activeIndex || (idx === state.activeIndex && state.saved);
    rows += `<tr class="${locked ? 'locked' : ''}">
      <td class="op">${meta.op}</td>
      <td class="label">${meta.label}</td>
      <td class="val">${cellContent(key, idx)}</td>
    </tr>`;
    if (key === 'F') {
      const shown = state.activeIndex > idx;
      rows += `<tr class="subtotal ${shown ? '' : 'locked'}">
        <td class="op"></td><td class="label">Subtotal (C+V+F)</td>
        <td class="val">${shown ? fmt(s3()) : '—'}</td></tr>`;
    }
    if (key === 'T') {
      const shown = state.activeIndex > idx;
      rows += `<tr class="subtotal ${shown ? '' : 'locked'}">
        <td class="op"></td><td class="label">Suma total</td>
        <td class="val">${shown ? fmt(s4()) : '—'}</td></tr>`;
    }
    if (key === 'opening') {
      const shown = state.activeIndex > idx;
      const fr = shown ? finalResult() : 0;
      rows += `<tr class="final-row ${shown ? '' : 'locked'}">
        <td class="op"></td><td class="label">RESULTADO FINAL</td>
        <td class="val ${fr < 0 ? 'negative' : ''}">${shown ? fmt(fr) : '—'}</td></tr>`;
    }
  });
  return rows;
}

function renderApp() {
  if (state.saved) {
    appEl.innerHTML = `
      <div class="card">
        <div class="success">La información fue guardada correctamente, Fabian.</div>
        <div style="text-align:center; color:var(--muted); font-size:0.85rem; margin:-10px 0 14px;">Abriendo facturación en unos segundos…</div>
        <button id="newDayBtn">Cargar otro día</button>
        <button class="secondary" id="menuFromSavedBtn" style="margin-top:10px;">Volver al menú</button>
      </div>`;
    document.getElementById('newDayBtn').onclick = () => { clearTimeout(autoAdvanceTimer); state = freshState(); renderAll(); };
    document.getElementById('menuFromSavedBtn').onclick = () => { clearTimeout(autoAdvanceTimer); view = 'menu'; renderAll(); };
    return;
  }

  const isFinalStep = state.activeIndex === STEPS.length;
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <table class="ledger">
      <caption class="sr-only">Cierre diario paso a paso</caption>
      ${buildRows()}
    </table>
    <div class="error">${state.error || ''}</div>
    <div class="controls">
      <button class="secondary" id="backToMenuFromCierreBtn" ${state.saving ? 'disabled' : ''}>← Volver al menú</button>
      <button class="secondary" id="backBtn" ${state.activeIndex === 0 || state.saving ? 'disabled' : ''}>← Atrás</button>
      <button id="confirmBtn" ${state.saving ? 'disabled' : ''}>${isFinalStep ? (state.saving ? 'Guardando…' : 'Guardar día') : 'Confirmar →'}</button>
    </div>
  `;
  appEl.innerHTML = '';
  appEl.appendChild(card);

  card.querySelector('#backToMenuFromCierreBtn').onclick = () => {
    if (state.saving) return;
    view = 'menu';
    renderAll();
  };

  card.querySelector('#backBtn').onclick = () => {
    if (state.activeIndex === 0 || state.saving) return;
    state.activeIndex -= 1;
    state.error = '';
    renderAll();
  };

  card.querySelector('#confirmBtn').onclick = onConfirm;

  const input = card.querySelector('#stepInput');
  if (input) {
    input.focus();
    input.addEventListener('keydown', e => { if (e.key === 'Enter') onConfirm(); });
  }
}

function onConfirm() {
  if (state.activeIndex === STEPS.length) {
    trySave();
    return;
  }
  const key = STEPS[state.activeIndex];
  const card = appEl.querySelector('.card');
  const input = card.querySelector('#stepInput');

  if (key === 'opening' && !isFirstOfMonth(state.dateISO) && state._autoOpening !== null && state._autoOpening !== undefined) {
    state.values.opening = state._autoOpening;
    state.openingSource = 'auto';
    state.error = '';
    state.activeIndex += 1;
    renderAll();
    return;
  }

  const raw = input ? input.value : '';
  const v = Number(raw);

  if (key === 'platos') {
    if (raw === '' || !Number.isInteger(v) || v <= 0 || v > 500) {
      state.error = 'Platos debe ser un número entero positivo, máximo 500.';
      renderAll();
      return;
    }
  } else {
    if (raw === '' || isNaN(v) || v <= 0) {
      state.error = 'Ingresá un número positivo.';
      renderAll();
      return;
    }
  }

  state.values[key] = v;
  if (key === 'opening') {
    state.openingSource = isFirstOfMonth(state.dateISO) ? 'manual' : 'manual-fallback';
  }
  state.error = '';
  state.activeIndex += 1;
  renderAll();
}

function errorMessage(code) {
  switch (code) {
    case 'bad_password': return 'Contraseña incorrecta.';
    case 'invalid_session': return 'Tu sesión expiró. Volvé a ingresar la contraseña.';
    case 'too_many_attempts': return 'Demasiados intentos fallidos. Esperá unos minutos y volvé a intentar.';
    case 'invalid_record': return 'Algún valor no es válido. Revisá los números e intentá de nuevo.';
    case 'invalid_plato': return 'Algún dato del plato no es válido. Revisá nombre, categoría y precio.';
    default: return 'No se pudo guardar. Revisá tu conexión e intentá de nuevo.';
  }
}

async function trySave() {
  const existing = db.find(r => r.dateISO === state.dateISO);
  if (existing) {
    const ok = confirm(`Fabian, ya existe un cierre guardado para el ${toDisplayDate(state.dateISO)}. ¿Querés sobreescribirlo?`);
    if (!ok) return;
  }

  const record = {
    dateISO: state.dateISO,
    C: state.values.C, V: state.values.V, F: state.values.F, T: state.values.T,
    opening: state.values.opening,
    final: finalResult(),
    platos: state.values.platos,
    fiscal: state.values.fiscal,
  };

  state.saving = true;
  state.error = '';
  renderAll();

  try {
    const res = await fetch(WORKER_BASE + '/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Token': sessionToken },
      body: JSON.stringify({ record }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      state.saving = false;
      if (data.error === 'invalid_session') { logout(); return; }
      state.error = errorMessage(data.error);
      renderAll();
      return;
    }
    db = db.filter(r => r.dateISO !== record.dateISO);
    db.push({ ...record, s3: s3() });
    db.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    state.saving = false;
    state.saved = true;
    renderAll();
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = setTimeout(() => {
      view = 'facturacion';
      facturacionMonth = record.dateISO.slice(0, 7);
      renderAll();
    }, 3000);
  } catch (e) {
    state.saving = false;
    state.error = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.';
    renderAll();
  }
}
