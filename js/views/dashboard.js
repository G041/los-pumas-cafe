function ymOf(dateISO) { return dateISO.slice(0, 7); }

function prevYm(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function computeDashboardStats() {
  const sorted = [...db].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const sum = (arr, key) => arr.reduce((a, r) => a + (Number(r[key]) || 0), 0);

  const todayYm = isoToday().slice(0, 7);
  const thisMonth = sorted.filter(r => ymOf(r.dateISO) === todayYm);
  const lastMonth = sorted.filter(r => ymOf(r.dateISO) === prevYm(todayYm));

  const ventasThisMonth = sum(thisMonth, 's3');
  const ventasLastMonth = sum(lastMonth, 's3');
  // Compare daily averages, not raw totals: the current month is almost always
  // partial, so a totals comparison would look like a crash on day 2 of the month.
  const avgThisMonth = thisMonth.length > 0 ? ventasThisMonth / thisMonth.length : 0;
  const avgLastMonth = lastMonth.length > 0 ? ventasLastMonth / lastMonth.length : 0;
  const momPct = avgLastMonth > 0 ? ((avgThisMonth - avgLastMonth) / avgLastMonth * 100) : null;

  const platosThisMonth = sum(thisMonth, 'platos');
  const avgTicket = platosThisMonth > 0 ? Math.round(ventasThisMonth / platosThisMonth) : 0;
  const fiscalThisMonth = sum(thisMonth, 'fiscal');

  const cashThisMonth = sum(thisMonth, 'C');
  const cardThisMonth = sum(thisMonth, 'V');
  const ccTotal = cashThisMonth + cardThisMonth;
  const cashPct = ccTotal > 0 ? Math.round(cashThisMonth / ccTotal * 100) : 0;
  const cardPct = ccTotal > 0 ? 100 - cashPct : 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 29);
  const cutoffIso = new Date(cutoff - cutoff.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const trend = sorted.filter(r => r.dateISO >= cutoffIso);

  const weekdaySum = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCount = [0, 0, 0, 0, 0, 0, 0];
  sorted.forEach(r => {
    const jsDay = new Date(r.dateISO + 'T00:00:00').getDay();
    const idx = (jsDay + 6) % 7; // Mon=0 .. Sun=6
    weekdaySum[idx] += r.s3;
    weekdayCount[idx] += 1;
  });
  const weekdayAvg = weekdaySum.map((s, i) => weekdayCount[i] ? s / weekdayCount[i] : 0);
  const hasWeekdayData = weekdayCount.some(c => c > 0);
  let bestIdx = 0;
  weekdayAvg.forEach((v, i) => { if (v > weekdayAvg[bestIdx]) bestIdx = i; });

  const recent = sorted.slice(-6).reverse();

  return {
    hasAnyData: sorted.length > 0,
    ventasThisMonth, momPct, platosThisMonth, avgTicket, fiscalThisMonth,
    cashThisMonth, cardThisMonth, cashPct, cardPct, ccTotal,
    trend, weekdayAvg, bestIdx, hasWeekdayData, recent,
  };
}

function buildSalesTrendChart(trend) {
  const w = 640, h = 220, padL = 46, padR = 10, padT = 14, padB = 26;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const n = trend.length;
  const values = trend.map(r => r.s3);
  const maxVal = Math.max(...values, 1) * 1.15;

  const points = trend.map((r, i) => {
    const x = n === 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW;
    const y = padT + innerH - (r.s3 / maxVal) * innerH;
    return { x, y, dateISO: r.dateISO, value: r.s3 };
  });
  const baseline = padT + innerH;
  const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  const areaPath = `${linePath} L${points[n - 1].x.toFixed(1)},${baseline.toFixed(1)} L${points[0].x.toFixed(1)},${baseline.toFixed(1)} Z`;

  const gridLines = [0.25, 0.5, 0.75].map(f => {
    const y = padT + innerH * (1 - f);
    const val = Math.round(maxVal * f);
    return `<line x1="${padL}" x2="${w - padR}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--card-border)" stroke-width="1" stroke-dasharray="3,4"/>
      <text x="${padL - 8}" y="${(y + 4).toFixed(1)}" font-size="10" text-anchor="end" fill="var(--muted)">${fmt(val)}</text>`;
  }).join('');

  const labelIdxs = [...new Set(n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0])];
  const xLabels = labelIdxs.map(i => {
    const p = points[i];
    return `<text x="${p.x.toFixed(1)}" y="${h - 6}" font-size="10" text-anchor="middle" fill="var(--muted)">${toDisplayDate(trend[i].dateISO).slice(0, 5)}</text>`;
  }).join('');

  const html = `
    <svg class="dash-chart-svg" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="dashAreaFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--viz-series-1)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="var(--viz-series-1)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <line x1="${padL}" x2="${w - padR}" y1="${baseline.toFixed(1)}" y2="${baseline.toFixed(1)}" stroke="var(--card-border)" stroke-width="1"/>
      <path d="${areaPath}" fill="url(#dashAreaFade)" stroke="none"/>
      <path d="${linePath}" fill="none" stroke="var(--viz-series-1)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <line class="dash-crosshair" x1="0" x2="0" y1="${padT}" y2="${baseline.toFixed(1)}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3,3" style="opacity:0;"/>
      <circle class="dash-hover-dot" r="4.5" fill="var(--viz-series-1)" stroke="var(--card)" stroke-width="2" style="opacity:0;"/>
      ${xLabels}
    </svg>`;
  return { html, points, w, h };
}

function wireTrendChartHover(wrapEl, chart) {
  const svg = wrapEl.querySelector('svg');
  const tooltip = wrapEl.querySelector('.dash-tooltip');
  const crosshair = svg.querySelector('.dash-crosshair');
  const dot = svg.querySelector('.dash-hover-dot');
  const points = chart.points;
  if (!svg || !points.length) return;

  const showPoint = (nearest) => {
    crosshair.setAttribute('x1', nearest.x);
    crosshair.setAttribute('x2', nearest.x);
    crosshair.style.opacity = 1;
    dot.setAttribute('cx', nearest.x);
    dot.setAttribute('cy', nearest.y);
    dot.style.opacity = 1;
    tooltip.querySelector('.tt-date').textContent = toDisplayDate(nearest.dateISO);
    tooltip.querySelector('.tt-val').textContent = '$ ' + fmt(nearest.value);
    tooltip.style.left = (nearest.x / chart.w * 100) + '%';
    tooltip.style.top = (nearest.y / chart.h * 100) + '%';
    tooltip.classList.add('visible');
  };

  svg.addEventListener('mousemove', (e) => {
    const rect = svg.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const svgX = (relX / rect.width) * chart.w;
    let nearest = points[0], bestDist = Infinity;
    points.forEach(p => { const d = Math.abs(p.x - svgX); if (d < bestDist) { bestDist = d; nearest = p; } });
    showPoint(nearest);
  });
  svg.addEventListener('mouseleave', () => {
    crosshair.style.opacity = 0;
    dot.style.opacity = 0;
    tooltip.classList.remove('visible');
  });
}

function renderMenu() {
  dateBarEl.innerHTML = '';
  stepperEl.innerHTML = '';

  if (!db || !db.length) {
    appEl.innerHTML = `
      <div class="dashboard">
        <div class="dash-hero">
          <img src="logo_circular.png" alt="Los Pumas Cafe">
          <div class="dash-hero-text">
            <div class="dash-hero-greeting">¿Qué querés hacer, Fabian?</div>
            <div class="dash-hero-sub">Todavía no hay cierres cargados: el panel de estadísticas va a aparecer apenas cargues el primer día.</div>
          </div>
        </div>
        <div class="dash-widget">
          <div class="dash-actions">
            <button class="dash-action-tile" id="goCierre"><span class="dash-action-icon" style="background:var(--viz-series-1);">💰</span> Sistema de cierre de caja</button>
            <button class="dash-action-tile" id="goFacturacion"><span class="dash-action-icon" style="background:var(--viz-series-3);">📊</span> Ver facturación de Los Pumas Cafe</button>
            <button class="dash-action-tile" id="goMenuBuilder"><span class="dash-action-icon" style="background:var(--viz-series-2);">📋</span> Armar menú del día</button>
          </div>
        </div>
      </div>`;
    wireDashboardActions();
    return;
  }

  const s = computeDashboardStats();
  const todayRecord = db.find(r => r.dateISO === isoToday());

  const momHtml = s.momPct === null
    ? `<div class="dash-kpi-delta flat">Primer mes con datos</div>`
    : `<div class="dash-kpi-delta ${s.momPct > 0 ? 'up' : (s.momPct < 0 ? 'down' : 'flat')}">${s.momPct > 0 ? '↑' : (s.momPct < 0 ? '↓' : '—')} ${Math.abs(s.momPct).toFixed(1)}% promedio diario vs mes anterior</div>`;

  const chart = s.trend.length ? buildSalesTrendChart(s.trend) : null;

  const weekdayBarsHtml = s.hasWeekdayData ? (() => {
    const maxAvg = Math.max(...s.weekdayAvg, 1);
    return s.weekdayAvg.map((v, i) => `
      <div class="dash-weekday-col ${i === s.bestIdx ? 'best' : ''}">
        <div class="dash-weekday-value">$ ${fmt(Math.round(v))}</div>
        <div class="dash-weekday-bar" style="height:${Math.max(4, (v / maxAvg) * 100)}%;"></div>
        <div class="dash-weekday-label">${WEEKDAY_LABELS[i]}</div>
      </div>`).join('');
  })() : '';

  const recentRowsHtml = s.recent.map(r => `
    <tr>
      <td>${toDisplayDate(r.dateISO)}</td>
      <td>$ ${fmt(r.s3)}</td>
      <td class="${r.final >= 0 ? 'result-pos' : 'result-neg'}">$ ${fmt(r.final)}</td>
      <td>${r.platos}</td>
    </tr>`).join('');

  appEl.innerHTML = `
    <div class="dashboard">
      <div class="dash-hero">
        <img src="logo_circular.png" alt="Los Pumas Cafe">
        <div class="dash-hero-text">
          <div class="dash-hero-greeting">Hola, Fabian 👋</div>
          <div class="dash-hero-sub">Este es el panel de Los Pumas Cafe. Acá tenés un resumen de cómo viene el negocio.</div>
        </div>
        ${todayRecord
          ? `<div class="dash-hero-status ok">✔ Cierre de hoy cargado — $ ${fmt(todayRecord.s3)}</div>`
          : `<div class="dash-hero-status pending">Todavía no cargaste el cierre de hoy <button id="heroGoCierre">Cargar cierre</button></div>`}
      </div>

      <div class="dash-kpis">
        <div class="dash-kpi">
          <div class="dash-kpi-label">Ventas del mes</div>
          <div class="dash-kpi-value">$ ${fmt(s.ventasThisMonth)}</div>
          ${momHtml}
        </div>
        <div class="dash-kpi">
          <div class="dash-kpi-label">Ticket promedio por plato</div>
          <div class="dash-kpi-value">$ ${fmt(s.avgTicket)}</div>
          <div class="dash-kpi-delta flat">${s.platosThisMonth} platos vendidos</div>
        </div>
        <div class="dash-kpi">
          <div class="dash-kpi-label">Platos vendidos</div>
          <div class="dash-kpi-value">${s.platosThisMonth}</div>
          <div class="dash-kpi-delta flat">este mes</div>
        </div>
        <div class="dash-kpi">
          <div class="dash-kpi-label">Total fiscal del mes</div>
          <div class="dash-kpi-value">$ ${fmt(s.fiscalThisMonth)}</div>
          <div class="dash-kpi-delta flat">declarado</div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="dash-widget">
          <div class="dash-widget-title">Resumen de ventas</div>
          <div class="dash-widget-sub">Últimos ${s.trend.length} días con cierre cargado</div>
          ${chart ? `<div class="dash-chart-wrap">${chart.html}<div class="dash-tooltip"><div class="tt-date"></div><div class="tt-val"></div></div></div>` : `<div class="dash-empty">Todavía no hay suficientes datos para el gráfico.</div>`}
        </div>
        <div class="dash-widget">
          <div class="dash-widget-title">Accesos rápidos</div>
          <div class="dash-actions">
            <button class="dash-action-tile" id="goCierre"><span class="dash-action-icon" style="background:var(--viz-series-1);">💰</span> Cierre de caja</button>
            <button class="dash-action-tile" id="goFacturacion"><span class="dash-action-icon" style="background:var(--viz-series-3);">📊</span> Facturación</button>
            <button class="dash-action-tile" id="goMenuBuilder"><span class="dash-action-icon" style="background:var(--viz-series-2);">📋</span> Armar menú del día</button>
            <button class="dash-action-tile" id="goPlatos"><span class="dash-action-icon" style="background:var(--viz-series-4);">🍽️</span> Gestionar platos</button>
          </div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="dash-widget">
          <div class="dash-widget-title">Mejor día de la semana</div>
          <div class="dash-widget-sub">Promedio de ventas por día, todo el histórico</div>
          ${s.hasWeekdayData ? `<div class="dash-weekday-bars">${weekdayBarsHtml}</div>` : `<div class="dash-empty">Todavía no hay suficientes datos.</div>`}
        </div>
        <div class="dash-widget">
          <div class="dash-widget-title">Efectivo vs Tarjeta</div>
          <div class="dash-widget-sub">Este mes</div>
          ${s.ccTotal > 0 ? `
            <div class="dash-split-bar">
              <div class="dash-split-seg cash" style="flex:${s.cashPct};">${s.cashPct >= 12 ? s.cashPct + '%' : ''}</div>
              <div class="dash-split-seg card" style="flex:${s.cardPct};">${s.cardPct >= 12 ? s.cardPct + '%' : ''}</div>
            </div>
            <div class="dash-split-legend">
              <div class="dash-split-legend-item"><span class="dash-split-dot cash"></span>Efectivo — $ ${fmt(s.cashThisMonth)}</div>
              <div class="dash-split-legend-item"><span class="dash-split-dot card"></span>Tarjeta — $ ${fmt(s.cardThisMonth)}</div>
            </div>` : `<div class="dash-empty">Todavía no hay ventas este mes.</div>`}
        </div>
      </div>

      <div class="dash-widget">
        <div class="dash-widget-title">Últimos cierres</div>
        <table class="dash-recent">
          <thead><tr><th>Fecha</th><th>Ventas</th><th>Resultado</th><th>Platos</th></tr></thead>
          <tbody>${recentRowsHtml}</tbody>
        </table>
        <div class="controls" style="margin-top:12px;">
          <button class="secondary dash-link-btn" id="goFacturacionFromRecent">Ver facturación completa →</button>
        </div>
      </div>
    </div>`;

  wireDashboardActions();
  const heroBtn = appEl.querySelector('#heroGoCierre');
  if (heroBtn) heroBtn.onclick = () => { view = 'cierre'; state = freshState(); renderAll(); };
  const recentLink = appEl.querySelector('#goFacturacionFromRecent');
  if (recentLink) recentLink.onclick = () => { view = 'facturacion'; facturacionMonth = null; renderAll(); };

  if (chart) {
    const wrap = appEl.querySelector('.dash-chart-wrap');
    if (wrap) wireTrendChartHover(wrap, chart);
  }
}

function wireDashboardActions() {
  const goCierre = appEl.querySelector('#goCierre');
  const goFacturacion = appEl.querySelector('#goFacturacion');
  const goMenuBuilder = appEl.querySelector('#goMenuBuilder');
  const goPlatos = appEl.querySelector('#goPlatos');
  if (goCierre) goCierre.onclick = () => { view = 'cierre'; state = freshState(); renderAll(); };
  if (goFacturacion) goFacturacion.onclick = () => { view = 'facturacion'; facturacionMonth = null; renderAll(); };
  if (goMenuBuilder) goMenuBuilder.onclick = () => { view = 'menuBuilder'; if (!menuBuilderState) menuBuilderState = freshMenuBuilderState(); renderAll(); };
  if (goPlatos) goPlatos.onclick = () => { view = 'platos'; platoForm = freshPlatoForm(); platosViewState = freshPlatosViewState(); renderAll(); };
}
