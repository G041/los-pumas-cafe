function renderFacturacionView() {
  dateBarEl.innerHTML = '';
  stepperEl.innerHTML = '';

  const grouped = groupByMonth();
  const monthKeys = Object.keys(grouped).sort().reverse();
  if (!facturacionMonth || !grouped[facturacionMonth]) {
    facturacionMonth = monthKeys[0] || isoToday().slice(0, 7);
  }
  const rows = (grouped[facturacionMonth] || []).slice().sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  const sum = (key) => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
  const totalF = sum('F'), totalT = sum('T'), totalFinal = sum('final'), totalPlatos = sum('platos');

  const tabsHtml = monthKeys.length
    ? monthKeys.map(ym => `<div class="month-tab ${ym === facturacionMonth ? 'active' : ''}" data-ym="${ym}" role="tab" tabindex="0" aria-selected="${ym === facturacionMonth}">${monthLabel(ym)}</div>`).join('')
    : '<div class="month-tab">Sin datos todavía</div>';

  const rowsHtml = rows.length ? rows.map(r => `
    <tr>
      <td>${toDisplayDate(r.dateISO)}</td>
      <td>${fmt(r.C)}</td><td>${fmt(r.V)}</td><td>${fmt(r.F)}</td><td>${fmt(r.T)}</td>
      <td>${fmt(r.opening)}</td><td>${fmt(r.final)}</td><td>${r.platos}</td><td>${fmt(r.fiscal)}</td>
    </tr>`).join('') : `<tr><td colspan="9" style="text-align:center;color:var(--muted);">Sin entradas este mes</td></tr>`;

  appEl.innerHTML = `
    <div class="card">
      <h2 class="gate-title">Facturación de Los Pumas Cafe</h2>
      <div class="stepper" role="tablist" aria-label="Elegir mes">${tabsHtml}</div>
      <div class="billing-table-wrap" tabindex="0" role="region" aria-label="Detalle de facturación del mes">
        <table class="billing billing-wide">
          <caption class="sr-only">Cierres diarios del mes seleccionado</caption>
          <colgroup>
            <col style="width:10ch"><col style="width:10ch"><col style="width:10ch">
            <col style="width:10ch"><col style="width:10ch"><col style="width:10ch">
            <col style="width:10ch"><col style="width:6ch"><col style="width:10ch">
          </colgroup>
          <thead><tr><th>Fecha</th><th>C</th><th>V</th><th>F</th><th>T</th><th>Apertura</th><th>Final</th><th>Platos</th><th>Fiscal</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr class="billing-total">
              <td>TOTAL</td><td>—</td><td>—</td>
              <td>${fmt(totalF)}</td><td>${fmt(totalT)}</td><td>—</td>
              <td>${fmt(totalFinal)}</td><td>${totalPlatos}</td><td>—</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="controls">
        <button class="secondary" id="backToMenuBtn">${icon('arrowLeft',16)} Volver al menú</button>
        <button class="secondary" id="downloadCsvBtn">Descargar CSV</button>
        <button class="secondary" id="downloadXlsxBtn2">Descargar XLSX</button>
      </div>
    </div>`;

  appEl.querySelectorAll('.month-tab[data-ym]').forEach(el => {
    el.onclick = () => { facturacionMonth = el.dataset.ym; renderAll(); };
  });
  appEl.querySelector('#backToMenuBtn').onclick = () => { view = 'menu'; renderAll(); };
  appEl.querySelector('#downloadCsvBtn').onclick = downloadCSV;
  appEl.querySelector('#downloadXlsxBtn2').onclick = downloadXLSX;
}

function downloadXLSX() {
  const grouped = groupByMonth();
  const monthKeys = Object.keys(grouped).sort();
  const header = ['Fecha', 'C', 'V', 'F', 'T', 'Apertura', 'Final', 'Platos', 'Fiscal'];
  const wb = XLSX.utils.book_new();

  monthKeys.forEach(ym => {
    const rows = grouped[ym].slice().sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    const aoa = [header];
    rows.forEach(r => aoa.push([toDisplayDate(r.dateISO), r.C, r.V, r.F, r.T, r.opening, r.final, r.platos, r.fiscal]));
    const totalF = rows.reduce((acc, r) => acc + r.F, 0);
    const totalT = rows.reduce((acc, r) => acc + r.T, 0);
    const totalFinal = rows.reduce((acc, r) => acc + r.final, 0);
    const totalPlatos = rows.reduce((acc, r) => acc + r.platos, 0);
    aoa.push(['TOTAL', '', '', totalF, totalT, '', totalFinal, totalPlatos, '']);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, monthLabel(ym).slice(0, 31));
  });

  if (monthKeys.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header]), 'Sin datos');
  }

  XLSX.writeFile(wb, 'los_pumas_cafe.xlsx');
}

function downloadCSV() {
  const header = 'date,C,V,F,T,opening,final,platos,fiscal';
  const lines = [...db].sort((a, b) => a.dateISO.localeCompare(b.dateISO)).map(r =>
    [toDisplayDate(r.dateISO), r.C, r.V, r.F, r.T, r.opening, r.final, r.platos, r.fiscal].join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'los_pumas_cafe_db.csv';
  a.click();
  URL.revokeObjectURL(url);
}
