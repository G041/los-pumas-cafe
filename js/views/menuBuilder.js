// Lines look like "nombre plato $ precio" - split on the LAST '$' so dish
// names are free to contain anything except the literal separator.
function parseMenuLines(text) {
  const parsed = [];
  text.split(/\r?\n/).forEach(raw => {
    const line = raw.trim();
    if (!line) return;
    const sepIdx = line.lastIndexOf('$');
    if (sepIdx === -1) return;
    const nombre = line.slice(0, sepIdx).trim().replace(/^\d+\)\s*/, '');
    const precio = Number(line.slice(sepIdx + 1).trim().replace(/[^\d.]/g, ''));
    if (!nombre || !precio || isNaN(precio) || precio <= 0) return;
    parsed.push({ nombre, precio });
  });
  return parsed;
}

// counts how many "N) nombre $ precio" lines are already in the menu, so the
// next plato added via the search results gets the correct running number.
function countNumberedPlatos(text) {
  return text.split(/\r?\n/).filter(l => /^\d+\)\s*\S/.test(l.trim())).length;
}

function undoLastPlato() {
  const lines = menuBuilderState.text.split(/\r?\n/);
  let idx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\d+\)\s*\S/.test(lines[i].trim())) { idx = i; break; }
  }
  if (idx === -1) return;
  lines.splice(idx, 1);
  // collapse the now-adjacent blank lines left behind by the removed entry
  const cleaned = lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
  menuBuilderState.text = cleaned;
}

// KV holds the whole platos catalog under one key, so concurrent writes would
// clobber each other's read-modify-write - these MUST run sequentially.
async function executeMenuSave(updates) {
  menuBuilderState.saving = true;
  menuBuilderState.error = '';
  renderAll();

  try {
    for (const plato of updates) {
      const res = await fetch(WORKER_BASE + '/api/platos/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': sessionToken },
        body: JSON.stringify({ plato }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw Object.assign(new Error(data.error || 'save_failed'), { code: data.error });
      }
      platosDb = platosDb.filter(p => p.nombre !== plato.nombre);
      platosDb.push(plato);
    }
    const copied = await copyToClipboard(menuBuilderState.text);
    menuBuilderState.saving = false;
    menuBuilderState.confirmingNew = null;
    menuBuilderState.pendingUpdates = null;
    menuBuilderState.success = copied ? 'copied' : 'saved_no_copy';
    renderAll();
    setTimeout(() => { menuBuilderState.success = false; renderAll(); }, 4000);
  } catch (e) {
    menuBuilderState.saving = false;
    if (e.code === 'invalid_session') { logout(); return; }
    menuBuilderState.error = errorMessage(e.code);
    renderAll();
  }
}

function onCopiarMenuClick() {
  const parsedLines = parseMenuLines(menuBuilderState.text);
  const updates = [];
  const newOnes = [];
  const seen = new Set();

  parsedLines.forEach(pl => {
    const existing = findPlatoByName(pl.nombre);
    if (existing) {
      if (Number(existing.ultimoPrecio) !== pl.precio) {
        updates.push({ nombre: existing.nombre, categoria: existing.categoria, ultimaFecha: isoToday(), ultimoPrecio: pl.precio });
      }
    } else {
      const key = normalizeName(pl.nombre);
      if (!seen.has(key)) {
        seen.add(key);
        newOnes.push({ nombre: pl.nombre, precio: pl.precio, categoria: '' });
      }
    }
  });

  if (!parsedLines.length) {
    menuBuilderState.error = 'El menú está vacío. Escribí al menos un plato con su precio.';
    renderAll();
    return;
  }

  if (newOnes.length) {
    menuBuilderState.confirmingNew = newOnes;
    menuBuilderState.pendingUpdates = updates;
    menuBuilderState.error = '';
    renderAll();
    return;
  }

  executeMenuSave(updates);
}

function renderMenuBuilderView() {
  dateBarEl.innerHTML = '';
  stepperEl.innerHTML = '';

  if (menuBuilderState.confirmingNew) {
    renderMenuBuilderConfirmView();
    return;
  }

  const q = normalizeName(menuBuilderState.search);
  const cat = menuBuilderState.categoriaFilter;
  const active = !!(q || cat);
  const pool = platosDb.filter(p => p.categoria !== 'Postre' && p.categoria !== 'Tartas');
  let results = [];
  if (active) {
    results = pool
      .filter(p => (!cat || p.categoria === cat) && (!q || normalizeName(p.nombre).includes(q)))
      .slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  const resultsHtml = !active
    ? ''
    : `<div class="plato-search-results" role="listbox" aria-label="Platos encontrados">${results.length ? results.map(p => `
        <div class="plato-search-item" data-nombre="${escapeHtml(p.nombre)}" role="option" tabindex="0" aria-label="Agregar ${escapeHtml(p.nombre)} al menú">
          <div class="plato-search-name">${escapeHtml(p.nombre)}</div>
          <div class="plato-search-meta">${escapeHtml(p.categoria)} · Últ. uso ${toDisplayDate(p.ultimaFecha)} · $ ${fmt(p.ultimoPrecio)}</div>
        </div>`).join('') : `<div class="plato-search-empty">Sin resultados</div>`}</div>`;

  const categoriaPillsHtml = PLATO_CATEGORIAS.filter(c => c !== 'Postre' && c !== 'Tartas').map(c =>
    `<div class="month-tab plato-cat-pill ${cat === c ? 'active' : ''}" data-cat="${escapeHtml(c)}" role="button" tabindex="0" aria-pressed="${cat === c}">${escapeHtml(c)}</div>`
  ).join('');

  let successMsg = '';
  if (menuBuilderState.success === 'copied') successMsg = 'Menú guardado y copiado al portapapeles';
  else if (menuBuilderState.success === 'saved_no_copy') successMsg = 'Menú guardado, pero no se pudo copiar automáticamente. Copialo manualmente.';

  appEl.innerHTML = `
    <div class="card">
      <h2 class="gate-title">Armado de menú del día</h2>
      <div class="menu-builder-layout">
        <div class="menu-editor">
          <textarea id="menuEditor" class="menu-textarea" placeholder="Escribí acá el menú del día..." aria-label="Texto del menú del día">${escapeHtml(menuBuilderState.text)}</textarea>
        </div>
        <div class="menu-search">
          <input id="menuSearchInput" class="pw-input" type="search" placeholder="Buscá un plato o elegí una categoría para ver opciones" aria-label="Buscar plato para agregar al menú" value="${escapeHtml(menuBuilderState.search)}">
          <div class="plato-category-pills" role="group" aria-label="Filtrar por categoría">${categoriaPillsHtml}</div>
          ${active ? resultsHtml : `<button type="button" class="postres-btn" id="postresBtn">${icon('cake',18)} Postres disponibles</button>`}
          ${active ? `<button type="button" class="postres-btn postres-btn-compact" id="postresBtn">${icon('cake',18)} Postres disponibles</button>` : ''}
          ${active ? '' : `<button type="button" class="postres-btn" id="tartasBtn">${icon('pie',18)} Tartas disponibles</button>`}
          ${active ? `<button type="button" class="postres-btn postres-btn-compact" id="tartasBtn">${icon('pie',18)} Tartas disponibles</button>` : ''}
          <button type="button" class="secondary" id="undoPlatoBtn" style="margin-top:auto;">${icon('undo',16)} Deshacer</button>
        </div>
      </div>
      <div class="error">${menuBuilderState.error || ''}</div>
      ${successMsg ? `<div class="success" style="font-size:1rem;">${successMsg}</div>` : ''}
      <div class="controls">
        <button class="secondary" id="backToMenuFromBuilderBtn">${icon('arrowLeft',16)} Volver al menú</button>
        <button class="secondary" id="goPlatosFromBuilderBtn">${icon('sliders',16)} Gestionar platos</button>
        <button id="copiarMenuBtn" ${menuBuilderState.saving ? 'disabled' : ''}>${menuBuilderState.saving ? 'Guardando…' : 'Copiar menú'}</button>
      </div>
    </div>
    ${menuBuilderState.postresModalOpen ? renderPostresModalHtml() : ''}
    ${menuBuilderState.tartasModalOpen ? renderTartasModalHtml() : ''}`;

  const editor = appEl.querySelector('#menuEditor');
  editor.oninput = (e) => { menuBuilderState.text = e.target.value; };

  const searchInput = appEl.querySelector('#menuSearchInput');
  searchInput.oninput = (e) => {
    menuBuilderState.search = e.target.value;
    const caret = e.target.selectionStart;
    renderAll();
    const newInput = appEl.querySelector('#menuSearchInput');
    if (newInput) { newInput.focus(); newInput.setSelectionRange(caret, caret); }
  };

  appEl.querySelectorAll('.plato-cat-pill').forEach(el => {
    el.onclick = () => {
      menuBuilderState.categoriaFilter = menuBuilderState.categoriaFilter === el.dataset.cat ? '' : el.dataset.cat;
      renderAll();
    };
  });

  appEl.querySelectorAll('.plato-search-item').forEach(el => {
    el.onclick = () => {
      const p = platosDb.find(x => x.nombre === el.dataset.nombre);
      if (!p) return;
      const n = countNumberedPlatos(menuBuilderState.text) + 1;
      const line = `${n}) ${p.nombre} $ ${Math.round(p.ultimoPrecio)}`;
      let current = menuBuilderState.text;
      if (current && !/\n\s*\n$/.test(current)) {
        current = current.replace(/\n*$/, '') + '\n\n';
      }
      menuBuilderState.text = current + line + '\n\n';
      editor.value = menuBuilderState.text;
      editor.scrollTop = editor.scrollHeight;
      editor.focus();
    };
  });

  const undoBtn = appEl.querySelector('#undoPlatoBtn');
  if (undoBtn) undoBtn.onclick = () => {
    undoLastPlato();
    editor.value = menuBuilderState.text;
    editor.scrollTop = editor.scrollHeight;
    editor.focus();
  };

  appEl.querySelector('#goPlatosFromBuilderBtn').onclick = () => { view = 'platos'; platoForm = freshPlatoForm(); platosViewState = freshPlatosViewState(); renderAll(); };
  appEl.querySelector('#backToMenuFromBuilderBtn').onclick = () => { view = 'menu'; renderAll(); };
  appEl.querySelector('#copiarMenuBtn').onclick = onCopiarMenuClick;

  const postresBtn = appEl.querySelector('#postresBtn');
  if (postresBtn) postresBtn.onclick = () => {
    menuBuilderState.postresWorking = new Set(menuBuilderState.selectedPostres);
    menuBuilderState.postresModalOpen = true;
    renderAll();
  };

  if (menuBuilderState.postresModalOpen) wirePostresModal();

  const tartasBtn = appEl.querySelector('#tartasBtn');
  if (tartasBtn) tartasBtn.onclick = () => {
    menuBuilderState.tartasWorking = new Set(menuBuilderState.selectedTartas);
    menuBuilderState.tartasModalOpen = true;
    renderAll();
  };

  if (menuBuilderState.tartasModalOpen) wireTartasModal();
}

function renderPostresModalHtml() {
  const postres = platosDb.filter(p => p.categoria === 'Postre').slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  const cols = Math.max(1, Math.ceil(postres.length / 3));
  const working = menuBuilderState.postresWorking || new Set();
  const chipsHtml = postres.map(p => `
    <div class="postre-chip ${working.has(p.nombre) ? 'selected' : ''}" data-nombre="${escapeHtml(p.nombre)}" role="checkbox" tabindex="0" aria-checked="${working.has(p.nombre)}">${escapeHtml(p.nombre)}</div>
  `).join('');

  return `
    <div class="postres-modal-overlay" id="postresOverlay" role="dialog" aria-modal="true" aria-labelledby="postresModalTitle">
      <div class="postres-modal">
        <h2 class="gate-title" id="postresModalTitle" style="margin-bottom:0;">Postres disponibles</h2>
        <div class="postres-grid" role="group" aria-label="Postres disponibles" style="grid-template-columns: repeat(${cols}, 1fr);">${chipsHtml}</div>
        <div class="controls">
          <button class="secondary" id="postresCancelBtn" data-modal-dismiss>Cancelar</button>
          <button id="postresConfirmBtn">Confirmar</button>
        </div>
      </div>
    </div>`;
}

function wirePostresModal() {
  const overlay = appEl.querySelector('#postresOverlay');
  if (!overlay) return;

  overlay.querySelectorAll('.postre-chip').forEach(el => {
    el.onclick = () => {
      const nombre = el.dataset.nombre;
      const working = menuBuilderState.postresWorking;
      if (working.has(nombre)) working.delete(nombre); else working.add(nombre);
      renderAll();
    };
  });

  overlay.querySelector('#postresCancelBtn').onclick = () => {
    menuBuilderState.postresModalOpen = false;
    menuBuilderState.postresWorking = null;
    renderAll();
  };

  overlay.querySelector('#postresConfirmBtn').onclick = () => {
    menuBuilderState.selectedPostres = new Set(menuBuilderState.postresWorking);
    const line = platosDb
      .filter(p => p.categoria === 'Postre' && menuBuilderState.selectedPostres.has(p.nombre))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(p => p.nombre)
      .join(' / ');

    let current = menuBuilderState.text;
    if (menuBuilderState.lastPostresLine && current.includes(menuBuilderState.lastPostresLine)) {
      current = current.replace(menuBuilderState.lastPostresLine, line);
      if (!line) current = current.replace(/\s+$/, '');
    } else if (line) {
      if (current && !/\n\s*\n$/.test(current)) {
        current = current.replace(/\n*$/, '') + '\n\n';
      }
      current = current + line;
    }
    menuBuilderState.text = current;
    menuBuilderState.lastPostresLine = line;
    menuBuilderState.postresModalOpen = false;
    menuBuilderState.postresWorking = null;
    renderAll();
    const editor = appEl.querySelector('#menuEditor');
    if (editor) { editor.scrollTop = editor.scrollHeight; editor.focus(); }
  };
}

// "Tartas del día" is a template item, not a selectable flavor - it only
// exists to carry the composite line's price (like any other plato).
function renderTartasModalHtml() {
  const tartas = platosDb
    .filter(p => p.categoria === 'Tartas' && p.nombre !== 'Tartas del día')
    .slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  const cols = Math.max(1, Math.ceil(tartas.length / 3));
  const working = menuBuilderState.tartasWorking || new Set();
  const chipsHtml = tartas.map(p => `
    <div class="postre-chip ${working.has(p.nombre) ? 'selected' : ''}" data-nombre="${escapeHtml(p.nombre)}" role="checkbox" tabindex="0" aria-checked="${working.has(p.nombre)}">${escapeHtml(p.nombre)}</div>
  `).join('');

  return `
    <div class="postres-modal-overlay" id="tartasOverlay" role="dialog" aria-modal="true" aria-labelledby="tartasModalTitle">
      <div class="postres-modal">
        <h2 class="gate-title" id="tartasModalTitle" style="margin-bottom:0;">Tartas disponibles</h2>
        <div class="postres-grid" role="group" aria-label="Tartas disponibles" style="grid-template-columns: repeat(${cols}, 1fr);">${chipsHtml}</div>
        <div class="controls">
          <button class="secondary" id="tartasCancelBtn" data-modal-dismiss>Cancelar</button>
          <button id="tartasConfirmBtn">Confirmar</button>
        </div>
      </div>
    </div>`;
}

function wireTartasModal() {
  const overlay = appEl.querySelector('#tartasOverlay');
  if (!overlay) return;

  overlay.querySelectorAll('.postre-chip').forEach(el => {
    el.onclick = () => {
      const nombre = el.dataset.nombre;
      const working = menuBuilderState.tartasWorking;
      if (working.has(nombre)) working.delete(nombre); else working.add(nombre);
      renderAll();
    };
  });

  overlay.querySelector('#tartasCancelBtn').onclick = () => {
    menuBuilderState.tartasModalOpen = false;
    menuBuilderState.tartasWorking = null;
    renderAll();
  };

  overlay.querySelector('#tartasConfirmBtn').onclick = () => {
    menuBuilderState.selectedTartas = new Set(menuBuilderState.tartasWorking);
    const tipos = platosDb
      .filter(p => p.categoria === 'Tartas' && p.nombre !== 'Tartas del día' && menuBuilderState.selectedTartas.has(p.nombre))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(p => p.nombre);
    const joined = joinTartaTypes(tipos);

    let body = '';
    if (joined) {
      const plantilla = findPlatoByName('Tartas del día');
      const precio = plantilla ? Math.round(plantilla.ultimoPrecio) : 0;
      body = `Tartas del día: ${joined} con Ensalada. $ ${precio}`;
    }

    let current = menuBuilderState.text;
    let newLine = '';
    if (body) {
      let num = null;
      if (menuBuilderState.lastTartasLine && current.includes(menuBuilderState.lastTartasLine)) {
        const m = menuBuilderState.lastTartasLine.match(/^(\d+)\)/);
        if (m) num = m[1];
      }
      if (num === null) num = countNumberedPlatos(current) + 1;
      newLine = `${num}) ${body}`;
    }

    if (menuBuilderState.lastTartasLine && current.includes(menuBuilderState.lastTartasLine)) {
      current = current.replace(menuBuilderState.lastTartasLine, newLine);
      if (!newLine) current = current.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
    } else if (newLine) {
      if (current && !/\n\s*\n$/.test(current)) {
        current = current.replace(/\n*$/, '') + '\n\n';
      }
      current = current + newLine + '\n\n';
    }
    menuBuilderState.text = current;
    menuBuilderState.lastTartasLine = newLine;
    menuBuilderState.tartasModalOpen = false;
    menuBuilderState.tartasWorking = null;
    renderAll();
    const editor = appEl.querySelector('#menuEditor');
    if (editor) { editor.scrollTop = editor.scrollHeight; editor.focus(); }
  };
}

function renderMenuBuilderConfirmView() {
  const items = menuBuilderState.confirmingNew;
  const rowsHtml = items.map((it, i) => `
    <div class="new-plato-row">
      <div class="new-plato-name">${escapeHtml(it.nombre)} — $ ${fmt(it.precio)}</div>
      <input class="pw-input new-plato-categoria" data-idx="${i}" list="platoCategoriaList" placeholder="Categoría para este plato nuevo" aria-label="Categoría para ${escapeHtml(it.nombre)}" value="${escapeHtml(it.categoria)}">
    </div>`).join('');
  const categoriaOptions = PLATO_CATEGORIAS.map(c => `<option value="${escapeHtml(c)}">`).join('');

  appEl.innerHTML = `
    <div class="card">
      <h2 class="gate-title">Platos nuevos detectados</h2>
      <p style="color:var(--muted); margin:0 0 10px;">No encontramos estos platos en la base. Asigná una categoría para darlos de alta junto con el menú de hoy.</p>
      ${rowsHtml}
      <datalist id="platoCategoriaList">${categoriaOptions}</datalist>
      <div class="error">${menuBuilderState.error || ''}</div>
      <div class="controls">
        <button class="secondary" id="cancelNewPlatosBtn" ${menuBuilderState.saving ? 'disabled' : ''}>Cancelar</button>
        <button id="confirmNewPlatosBtn" ${menuBuilderState.saving ? 'disabled' : ''}>${menuBuilderState.saving ? 'Guardando…' : 'Confirmar y copiar menú'}</button>
      </div>
    </div>`;

  appEl.querySelectorAll('.new-plato-categoria').forEach(el => {
    el.oninput = (e) => { menuBuilderState.confirmingNew[Number(e.target.dataset.idx)].categoria = e.target.value; };
  });
  appEl.querySelector('#cancelNewPlatosBtn').onclick = () => {
    menuBuilderState.confirmingNew = null;
    menuBuilderState.pendingUpdates = null;
    menuBuilderState.error = '';
    renderAll();
  };
  appEl.querySelector('#confirmNewPlatosBtn').onclick = () => {
    for (const it of menuBuilderState.confirmingNew) {
      if (!it.categoria || !it.categoria.trim()) {
        menuBuilderState.error = 'Asigná una categoría a todos los platos nuevos.';
        renderAll();
        return;
      }
    }
    const newUpdates = menuBuilderState.confirmingNew.map(it => ({
      nombre: it.nombre, categoria: it.categoria.trim(), ultimaFecha: isoToday(), ultimoPrecio: it.precio,
    }));
    const allUpdates = [...(menuBuilderState.pendingUpdates || []), ...newUpdates];
    executeMenuSave(allUpdates);
  };
}
