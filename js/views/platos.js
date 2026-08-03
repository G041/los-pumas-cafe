function renderPlatosView() {
  dateBarEl.innerHTML = '';
  stepperEl.innerHTML = '';

  const q = normalizeName(platosViewState.search);
  const rows = [...platosDb]
    .filter(p => !q || normalizeName(p.nombre).includes(q))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre));

  const rowsHtml = rows.length ? rows.map(p => `
    <tr class="plato-row" data-nombre="${escapeHtml(p.nombre)}" tabindex="0" role="button" aria-label="Editar ${escapeHtml(p.nombre)}">
      <td>${escapeHtml(p.nombre)}</td>
      <td>${escapeHtml(p.categoria)}</td>
      <td>${toDisplayDate(p.ultimaFecha)}</td>
      <td>${fmt(p.ultimoPrecio)}</td>
      <td><button type="button" class="plato-delete-btn" data-nombre="${escapeHtml(p.nombre)}" aria-label="Eliminar ${escapeHtml(p.nombre)}">✕</button></td>
    </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--muted);">${q ? 'Sin resultados' : 'No hay platos cargados'}</td></tr>`;

  const editing = !!platoForm.editingNombre;
  const categoriaOptions = PLATO_CATEGORIAS.map(c => `<option value="${escapeHtml(c)}">`).join('');

  appEl.innerHTML = `
    <div class="card">
      <h2 class="gate-title">Platos</h2>
      <input id="platosSearchInput" class="pw-input" type="search" placeholder="Buscar plato..." aria-label="Buscar plato" value="${escapeHtml(platosViewState.search)}">
      <div class="billing-table-wrap" tabindex="0" role="region" aria-label="Lista de platos">
        <table class="billing">
          <caption class="sr-only">Platos cargados en la base</caption>
          <thead><tr><th>Nombre</th><th>Categoría</th><th>Últ. uso</th><th>Últ. precio</th><th style="width:3.5ch;"><span class="sr-only">Eliminar</span></th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      <h3 class="form-section-title">${editing ? 'Editar plato' : 'Nuevo plato'}</h3>
      <input id="platoNombre" class="pw-input" placeholder="Nombre del plato (con guarnición)" aria-label="Nombre del plato" value="${escapeHtml(platoForm.nombre)}" ${editing ? 'readonly' : ''}>
      <input id="platoCategoria" class="pw-input" list="platoCategoriaList" placeholder="Categoría (ej. Carne, Pollo, Arroz)" aria-label="Categoría del plato" value="${escapeHtml(platoForm.categoria)}">
      <datalist id="platoCategoriaList">${categoriaOptions}</datalist>
      <input id="platoPrecio" class="pw-input" type="number" step="any" min="0" placeholder="Último precio" aria-label="Último precio del plato" value="${platoForm.ultimoPrecio}">
      <div class="error">${platoForm.error || platosViewState.error || ''}</div>
      <div class="controls">
        ${editing ? '<button class="secondary" id="cancelPlatoBtn">Cancelar</button>' : ''}
        <button id="savePlatoBtn" ${platoForm.saving ? 'disabled' : ''}>${platoForm.saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Agregar plato')}</button>
      </div>
      <div class="controls">
        <button class="secondary" id="backToMenuFromPlatosBtn">← Volver al menú</button>
        <button class="secondary" id="backToBuilderFromPlatosBtn">← Volver al armado de menú</button>
      </div>
    </div>
    ${platosViewState.confirmDelete ? renderDeletePlatoModalHtml() : ''}`;

  const searchInput = appEl.querySelector('#platosSearchInput');
  searchInput.oninput = (e) => {
    platosViewState.search = e.target.value;
    const caret = e.target.selectionStart;
    renderAll();
    const newInput = appEl.querySelector('#platosSearchInput');
    if (newInput) { newInput.focus(); newInput.setSelectionRange(caret, caret); }
  };

  appEl.querySelectorAll('.plato-row').forEach(el => {
    el.onclick = () => {
      const p = platosDb.find(x => x.nombre === el.dataset.nombre);
      if (!p) return;
      platoForm = { nombre: p.nombre, categoria: p.categoria, ultimoPrecio: p.ultimoPrecio, editingNombre: p.nombre, error: '', saving: false };
      renderAll();
    };
  });
  appEl.querySelectorAll('.plato-delete-btn').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      platosViewState.confirmDelete = el.dataset.nombre;
      renderAll();
    };
  });
  appEl.querySelector('#platoNombre').oninput = (e) => { platoForm.nombre = e.target.value; };
  appEl.querySelector('#platoCategoria').oninput = (e) => { platoForm.categoria = e.target.value; };
  appEl.querySelector('#platoPrecio').oninput = (e) => { platoForm.ultimoPrecio = e.target.value; };
  appEl.querySelector('#savePlatoBtn').onclick = savePlato;
  const cancelBtn = appEl.querySelector('#cancelPlatoBtn');
  if (cancelBtn) cancelBtn.onclick = () => { platoForm = freshPlatoForm(); renderAll(); };
  appEl.querySelector('#backToMenuFromPlatosBtn').onclick = () => { view = 'menu'; renderAll(); };
  appEl.querySelector('#backToBuilderFromPlatosBtn').onclick = () => { view = 'menuBuilder'; renderAll(); };

  if (platosViewState.confirmDelete) wireDeletePlatoModal();
}

function renderDeletePlatoModalHtml() {
  const nombre = platosViewState.confirmDelete;
  return `
    <div class="postres-modal-overlay" id="deletePlatoOverlay" role="dialog" aria-modal="true" aria-labelledby="deletePlatoTitle">
      <div class="postres-modal" style="max-width:480px;">
        <h2 class="gate-title" id="deletePlatoTitle" style="margin-bottom:0;">¿Eliminar este plato?</h2>
        <div style="color:var(--text);">Vas a eliminar <strong>${escapeHtml(nombre)}</strong> de la base de platos. Esta acción no se puede deshacer.</div>
        <div class="error">${platosViewState.error || ''}</div>
        <div class="controls">
          <button class="secondary" id="cancelDeletePlatoBtn" data-modal-dismiss ${platosViewState.deleting ? 'disabled' : ''}>Cancelar</button>
          <button id="confirmDeletePlatoBtn" ${platosViewState.deleting ? 'disabled' : ''}>${platosViewState.deleting ? 'Eliminando…' : 'Sí, eliminar'}</button>
        </div>
      </div>
    </div>`;
}

function wireDeletePlatoModal() {
  const overlay = appEl.querySelector('#deletePlatoOverlay');
  if (!overlay) return;
  overlay.querySelector('#cancelDeletePlatoBtn').onclick = () => {
    platosViewState.confirmDelete = null;
    platosViewState.error = '';
    renderAll();
  };
  overlay.querySelector('#confirmDeletePlatoBtn').onclick = deletePlato;
}

async function deletePlato() {
  const nombre = platosViewState.confirmDelete;
  platosViewState.deleting = true;
  platosViewState.error = '';
  renderAll();

  try {
    const res = await fetch(WORKER_BASE + '/api/platos/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Token': sessionToken },
      body: JSON.stringify({ nombre }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      platosViewState.deleting = false;
      if (data.error === 'invalid_session') { logout(); return; }
      platosViewState.error = errorMessage(data.error);
      renderAll();
      return;
    }
    platosDb = platosDb.filter(p => p.nombre !== nombre);
    if (platoForm.editingNombre === nombre) platoForm = freshPlatoForm();
    platosViewState.deleting = false;
    platosViewState.confirmDelete = null;
    renderAll();
  } catch (e) {
    platosViewState.deleting = false;
    platosViewState.error = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.';
    renderAll();
  }
}

async function savePlato() {
  const nombre = (platoForm.nombre || '').trim();
  const categoria = (platoForm.categoria || '').trim();
  const precio = Number(platoForm.ultimoPrecio);

  if (!nombre) { platoForm.error = 'Ingresá el nombre del plato.'; renderAll(); return; }
  if (!categoria) { platoForm.error = 'Ingresá la categoría.'; renderAll(); return; }
  if (!platoForm.ultimoPrecio || isNaN(precio) || precio <= 0) { platoForm.error = 'Ingresá un precio válido.'; renderAll(); return; }

  const plato = { nombre, categoria, ultimaFecha: isoToday(), ultimoPrecio: precio };

  platoForm.saving = true;
  platoForm.error = '';
  renderAll();

  try {
    const res = await fetch(WORKER_BASE + '/api/platos/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Token': sessionToken },
      body: JSON.stringify({ plato }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      platoForm.saving = false;
      if (data.error === 'invalid_session') { logout(); return; }
      platoForm.error = errorMessage(data.error);
      renderAll();
      return;
    }
    platosDb = platosDb.filter(p => p.nombre !== plato.nombre);
    platosDb.push(plato);
    platoForm = freshPlatoForm();
    renderAll();
  } catch (e) {
    platoForm.saving = false;
    platoForm.error = 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.';
    renderAll();
  }
}
