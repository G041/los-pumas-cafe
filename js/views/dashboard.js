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

/* ---------- Clima ----------
   El pronóstico llega después del render, así que el módulo se dibuja con lo
   que haya (esqueleto, datos o error) y se repinta solo cuando la respuesta
   aterriza. */

function weatherDayLabel(dateISO, i) {
  if (i === 0) return 'Hoy';
  const jsDay = new Date(dateISO + 'T00:00:00').getDay();
  return WEEKDAY_LABELS[(jsDay + 6) % 7]; // Lun=0 .. Dom=6, igual que arriba
}

function buildWeatherStrip() {
  return weatherState.days.map((d, i) => {
    const look = weatherLook(d.code);
    // Debajo del 20% la probabilidad no cambia ninguna decisión y sólo agrega
    // ruido a una tira de siete columnas.
    const pop = d.pop >= 20 ? `${icon('drizzle', 12)} ${d.pop}%` : '';
    return `<div class="dash-weather-day${i === 0 ? ' today' : ''}">
      <div class="dash-weather-name">${escapeHtml(weatherDayLabel(d.dateISO, i))}</div>
      <div class="dash-weather-icon">${icon(look.icon, 28)}</div>
      <div class="dash-weather-label">${escapeHtml(look.label)}</div>
      <div class="dash-weather-temps">
        <span class="dash-weather-max">${d.max}°</span>
        <span class="dash-weather-min">${d.min}°</span>
      </div>
      <div class="dash-weather-pop">${pop}</div>
    </div>`;
  }).join('');
}

function buildWeatherSkeleton() {
  const cell = `<div class="dash-weather-day skeleton">
    <div class="dash-weather-bone name"></div>
    <div class="dash-weather-bone dot"></div>
    <div class="dash-weather-bone line"></div>
  </div>`;
  return cell.repeat(WEATHER_DAYS);
}

function renderWeatherWidget() {
  const c = weatherState.current;
  const sub = c
    ? `Ahora ${c.temp}° · ${escapeHtml(weatherLook(c.code).label)}`
    : 'Pronóstico para los próximos 7 días';

  let body;
  if (weatherState.status === 'error') {
    body = `<div class="dash-empty">No se pudo cargar el clima.
      <div class="controls" style="margin-top:12px;">
        <button type="button" class="secondary dash-link-btn" id="weatherRetry">Reintentar</button>
      </div>
    </div>`;
  } else {
    body = `<div class="dash-weather-strip">${weatherState.days.length ? buildWeatherStrip() : buildWeatherSkeleton()}</div>`;
  }

  return `<div class="dash-widget-title">Clima en San Isidro</div>
    <div class="dash-widget-sub">${sub}</div>
    ${body}`;
}

function wireWeatherModule(el) {
  const retry = el.querySelector('#weatherRetry');
  if (retry) retry.onclick = () => retryWeather(repaintWeatherModule);
}

// Se reemplaza sólo esta tarjeta y no se llama a renderAll(): un render entero
// disparado desde una respuesta que llega en cualquier momento cortaría un
// arrastre en curso y le sacaría el foco a quien esté usando la pantalla.
function repaintWeatherModule() {
  if (view !== 'menu' || dashboardEditing) return;
  const card = appEl.querySelector('#bento-widget-clima .dash-widget');
  if (!card) return;
  card.innerHTML = renderWeatherWidget();
  wireWeatherModule(card);
}

/* ---------- Módulos del dashboard ----------
   Cada módulo se declara una sola vez: cuánto ocupa en la grilla de 12
   columnas, cómo se dibuja y cómo se conecta. El orden en que se muestran lo
   decide dashboardOrder, no este objeto. */
const DASH_MODULES = {
  'kpi-ventas': {
    span: 3,
    label: 'Ventas del mes',
    render: (s) => {
      const trendIcon = s.momPct > 0 ? 'arrowUp' : (s.momPct < 0 ? 'arrowDown' : 'minus');
      const delta = s.momPct === null
        ? `<div class="dash-kpi-delta flat">Primer mes con datos</div>`
        : `<div class="dash-kpi-delta ${s.momPct > 0 ? 'up' : (s.momPct < 0 ? 'down' : 'flat')}">${icon(trendIcon, 14)} ${Math.abs(s.momPct).toFixed(1)}% promedio diario vs mes anterior</div>`;
      return `<div class="dash-kpi">
        <div class="dash-kpi-label">Ventas del mes</div>
        <div class="dash-kpi-value">$ ${fmt(s.ventasThisMonth)}</div>
        ${delta}
      </div>`;
    },
  },

  'kpi-ticket': {
    span: 3,
    label: 'Ticket promedio por plato',
    render: (s) => `<div class="dash-kpi">
      <div class="dash-kpi-label">Ticket promedio por plato</div>
      <div class="dash-kpi-value">$ ${fmt(s.avgTicket)}</div>
      <div class="dash-kpi-delta flat">${s.platosThisMonth} platos vendidos</div>
    </div>`,
  },

  'kpi-platos': {
    span: 3,
    label: 'Platos vendidos',
    render: (s) => `<div class="dash-kpi">
      <div class="dash-kpi-label">Platos vendidos</div>
      <div class="dash-kpi-value">${s.platosThisMonth}</div>
      <div class="dash-kpi-delta flat">este mes</div>
    </div>`,
  },

  'kpi-fiscal': {
    span: 3,
    label: 'Total fiscal del mes',
    render: (s) => `<div class="dash-kpi">
      <div class="dash-kpi-label">Total fiscal del mes</div>
      <div class="dash-kpi-value">$ ${fmt(s.fiscalThisMonth)}</div>
      <div class="dash-kpi-delta flat">declarado</div>
    </div>`,
  },

  'widget-sales': {
    span: 8,
    label: 'Resumen de ventas',
    render: (s) => {
      const chart = s.trend.length ? buildSalesTrendChart(s.trend) : null;
      return `<div class="dash-widget">
        <div class="dash-widget-title">Resumen de ventas</div>
        <div class="dash-widget-sub">Últimos ${s.trend.length} días con cierre cargado</div>
        ${chart
          ? `<div class="dash-chart-wrap">${chart.html}<div class="dash-tooltip"><div class="tt-date"></div><div class="tt-val"></div></div></div>`
          : `<div class="dash-empty">Todavía no hay suficientes datos para el gráfico.</div>`}
      </div>`;
    },
    wire: (el, s) => {
      const wrap = el.querySelector('.dash-chart-wrap');
      // Mismo cálculo que en render: puro y determinístico, así que los puntos
      // coinciden con los que se dibujaron.
      if (wrap && s.trend.length) wireTrendChartHover(wrap, buildSalesTrendChart(s.trend));
    },
  },

  'widget-actions': {
    span: 4,
    label: 'Accesos rápidos',
    render: () => `<div class="dash-widget">
      <div class="dash-widget-title">Accesos rápidos</div>
      <div class="dash-actions">
        <button type="button" class="dash-action-tile" id="goCierre"><span class="dash-action-icon" style="--tile:var(--viz-series-1);">${icon('cash', 20)}</span> Cierre de caja</button>
        <button type="button" class="dash-action-tile" id="goFacturacion"><span class="dash-action-icon" style="--tile:var(--viz-series-3);">${icon('chart', 20)}</span> Facturación</button>
        <button type="button" class="dash-action-tile" id="goMenuBuilder"><span class="dash-action-icon" style="--tile:var(--viz-series-2);">${icon('clipboard', 20)}</span> Armar menú del día</button>
        <button type="button" class="dash-action-tile" id="goPlatos"><span class="dash-action-icon" style="--tile:var(--viz-series-4);">${icon('utensils', 20)}</span> Gestionar platos</button>
      </div>
    </div>`,
  },

  'widget-weekday': {
    span: 6,
    label: 'Mejor día de la semana',
    render: (s) => {
      const bars = s.hasWeekdayData ? (() => {
        const maxAvg = Math.max(...s.weekdayAvg, 1);
        return s.weekdayAvg.map((v, i) => `
          <div class="dash-weekday-col ${i === s.bestIdx ? 'best' : ''}">
            <div class="dash-weekday-track"><div class="dash-weekday-bar" style="height:${(v / maxAvg) * 100}%;"></div></div>
            <div class="dash-weekday-label">${WEEKDAY_LABELS[i]}</div>
          </div>`).join('');
      })() : '';
      // El monto va en el subtítulo y no flotando sobre la barra: en una columna
      // de celular no entra y terminaría recortado.
      const sub = s.hasWeekdayData
        ? `${WEEKDAY_LABELS_FULL[s.bestIdx]} es tu mejor día — $ ${fmt(Math.round(s.weekdayAvg[s.bestIdx]))} promedio`
        : 'Promedio de ventas por día, todo el histórico';
      return `<div class="dash-widget">
        <div class="dash-widget-title">Mejor día de la semana</div>
        <div class="dash-widget-sub">${sub}</div>
        ${s.hasWeekdayData ? `<div class="dash-weekday-bars">${bars}</div>` : `<div class="dash-empty">Todavía no hay suficientes datos.</div>`}
      </div>`;
    },
  },

  'widget-split': {
    span: 6,
    label: 'Efectivo vs Tarjeta',
    render: (s) => `<div class="dash-widget">
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
    </div>`,
  },

  'widget-clima': {
    span: 12,
    label: 'Clima en San Isidro',
    // No mira las estadísticas: es el único módulo cuyo dato no sale de db.
    render: () => `<div class="dash-widget">${renderWeatherWidget()}</div>`,
    wire: (el) => {
      wireWeatherModule(el);
      ensureWeather(repaintWeatherModule);
    },
  },

  'widget-recent': {
    span: 12,
    label: 'Últimos cierres',
    render: (s) => {
      const rows = s.recent.map(r => `
        <tr>
          <td>${toDisplayDate(r.dateISO)}</td>
          <td>$ ${fmt(r.s3)}</td>
          <td class="${r.final >= 0 ? 'result-pos' : 'result-neg'}">$ ${fmt(r.final)}</td>
          <td>${r.platos}</td>
        </tr>`).join('');
      return `<div class="dash-widget">
        <div class="dash-widget-title">Últimos cierres</div>
        <table class="dash-recent">
          <thead><tr><th>Fecha</th><th>Ventas</th><th>Resultado</th><th>Platos</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="controls" style="margin-top:12px;">
          <button type="button" class="secondary dash-link-btn" id="goFacturacionFromRecent">Ver facturación completa ${icon('arrowRight', 16)}</button>
        </div>
      </div>`;
    },
  },
};

function renderMenu() {
  dateBarEl.innerHTML = '';
  stepperEl.innerHTML = '';
  // La copia flotante vive fuera de #app, así que un render en medio de un
  // arrastre la dejaría colgada en pantalla.
  document.querySelectorAll('.bento-ghost').forEach(el => el.remove());

  if (!db || !db.length) {
    dashboardEditing = false;
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
            <button type="button" class="dash-action-tile" id="goCierre"><span class="dash-action-icon" style="--tile:var(--viz-series-1);">${icon('cash', 20)}</span> Sistema de cierre de caja</button>
            <button type="button" class="dash-action-tile" id="goFacturacion"><span class="dash-action-icon" style="--tile:var(--viz-series-3);">${icon('chart', 20)}</span> Ver facturación de Los Pumas Cafe</button>
            <button type="button" class="dash-action-tile" id="goMenuBuilder"><span class="dash-action-icon" style="--tile:var(--viz-series-2);">${icon('clipboard', 20)}</span> Armar menú del día</button>
          </div>
        </div>
      </div>`;
    wireDashboardActions();
    return;
  }

  const s = computeDashboardStats();
  const todayRecord = db.find(r => r.dateISO === isoToday());
  const total = dashboardOrder.length;

  const itemsHtml = dashboardOrder.map((id, i) => {
    const mod = DASH_MODULES[id];
    const editAttrs = dashboardEditing
      ? ` tabindex="0" role="group" aria-roledescription="Módulo reordenable" aria-label="${escapeHtml(mod.label)}, posición ${i + 1} de ${total}"`
      : '';
    return `<div class="bento-item bento-span-${mod.span}" id="bento-${id}" data-module="${id}"${editAttrs}>
      ${mod.render(s)}
      ${dashboardEditing ? `<span class="bento-grip">${icon('grip', 16)}</span>` : ''}
    </div>`;
  }).join('');

  appEl.innerHTML = `
    <div class="dashboard">
      <div class="dash-hero">
        <img src="logo_circular.png" alt="Los Pumas Cafe">
        <div class="dash-hero-text">
          <div class="dash-hero-greeting">Hola, Fabian <span class="dash-hero-mark">${icon('coffee', 19)}</span></div>
          <div class="dash-hero-sub">Este es el panel de Los Pumas Cafe. Acá tenés un resumen de cómo viene el negocio.</div>
        </div>
        ${dashboardEditing ? '' : (todayRecord
          ? `<div class="dash-hero-status ok">${icon('check', 17)} Cierre de hoy cargado — $ ${fmt(todayRecord.s3)}</div>`
          : `<div class="dash-hero-status pending">Todavía no cargaste el cierre de hoy <button type="button" id="heroGoCierre">Cargar cierre</button></div>`)}
        <div class="dash-hero-actions">
          ${dashboardEditing ? `<button type="button" class="secondary dash-edit-btn" id="dashCancelBtn">Cancelar</button>` : ''}
          <button type="button" class="dash-edit-btn ${dashboardEditing ? '' : 'secondary'}" id="dashEditBtn">
            ${dashboardEditing ? `${icon('check')} Guardar orden` : `${icon('pencil')} Personalizar`}
          </button>
        </div>
      </div>

      ${dashboardEditing ? `<p class="dash-edit-hint">Arrastrá los módulos para acomodarlos a tu gusto. Con teclado: elegí uno con Tab y movelo con Ctrl y las flechas.</p>` : ''}

      <div class="bento-grid ${dashboardEditing ? 'editing' : ''}">${itemsHtml}</div>
    </div>`;

  wireDashboardActions();

  const heroBtn = appEl.querySelector('#heroGoCierre');
  if (heroBtn) heroBtn.onclick = () => { view = 'cierre'; state = freshState(); renderAll(); };
  const recentLink = appEl.querySelector('#goFacturacionFromRecent');
  if (recentLink) recentLink.onclick = () => { view = 'facturacion'; facturacionMonth = null; renderAll(); };

  appEl.querySelector('#dashEditBtn').onclick = () => {
    if (dashboardEditing) {
      saveDashboardOrder();
      dashboardEditing = false;
      dashboardOrderBackup = null;
      announce('Orden del panel guardado.');
    } else {
      dashboardOrderBackup = dashboardOrder.slice();
      dashboardEditing = true;
      announce('Modo personalizar activado. Arrastrá los módulos para reordenarlos.');
    }
    renderAll();
  };

  const cancelBtn = appEl.querySelector('#dashCancelBtn');
  if (cancelBtn) cancelBtn.onclick = () => {
    if (dashboardOrderBackup) dashboardOrder = dashboardOrderBackup;
    dashboardOrderBackup = null;
    dashboardEditing = false;
    announce('Cambios descartados.');
    renderAll();
  };

  const grid = appEl.querySelector('.bento-grid');
  if (dashboardEditing) {
    // Los controles de adentro quedan inertes: en modo edición la tarjeta
    // entera es un objeto que se agarra, no una pantalla que se usa.
    grid.querySelectorAll('button').forEach(b => { b.disabled = true; });
    grid.addEventListener('pointerdown', onBentoPointerDown);
    grid.addEventListener('keydown', onBentoKeyDown);
  } else {
    dashboardOrder.forEach(id => {
      const mod = DASH_MODULES[id];
      if (mod.wire) mod.wire(appEl.querySelector('#bento-' + id), s);
    });
  }
}

// Salir del panel sin guardar equivale a cancelar: el orden vuelve al último
// guardado en vez de quedar a medio camino.
function exitDashboardEditing() {
  if (!dashboardEditing) return;
  if (dashboardOrderBackup) dashboardOrder = dashboardOrderBackup;
  dashboardOrderBackup = null;
  dashboardEditing = false;
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

/* ---------- Reordenamiento de módulos ----------
   Lo que sigue al puntero es una copia flotante; el módulo original se queda en
   la grilla como hueco y es ese hueco el que viaja. Así los vecinos tienen algo
   que esquivar y se corren de verdad: se mide dónde estaban, se cambia el orden
   y se anima la diferencia (FLIP), en vez de saltar a la posición nueva. */

const BENTO_FLIP_MS = 300;
const BENTO_FLIP_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const BENTO_DRAG_START_PX = 4;
const BENTO_EDGE_PX = 90;      // franja donde el arrastre empieza a scrollear
const BENTO_EDGE_SPEED = 16;   // px por frame en el borde mismo

let bentoDrag = null;

function bentoGrid() { return appEl.querySelector('.bento-grid'); }

// Posiciones visuales (incluyen la animación en curso): son el punto de partida
// del FLIP, así que un módulo que ya se estaba moviendo sigue desde donde está.
function captureBentoRects(grid) {
  const map = new Map();
  Array.from(grid.children).forEach(child => map.set(child, child.getBoundingClientRect()));
  return map;
}

function applyBentoDomOrder(grid) {
  dashboardOrder.forEach(id => {
    const child = grid.querySelector('#bento-' + id);
    if (child) grid.appendChild(child);
  });
}

function playBentoFlip(grid, before) {
  const moved = [];
  Array.from(grid.children).forEach(child => {
    const prev = before.get(child);
    if (!prev) return;
    const now = child.getBoundingClientRect();
    const dx = prev.left - now.left;
    const dy = prev.top - now.top;
    if (!dx && !dy) return;
    child.style.transition = 'none';
    child.style.transform = `translate(${dx}px, ${dy}px)`;
    moved.push(child);
  });
  if (!moved.length) return;
  void grid.offsetWidth; // fija la posición de arranque antes de animar
  moved.forEach(child => {
    child.style.transition = `transform ${BENTO_FLIP_MS}ms ${BENTO_FLIP_EASE}`;
    child.style.transform = '';
  });
}

function moveModuleTo(fromIdx, toIdx) {
  const grid = bentoGrid();
  if (!grid) return;
  const before = captureBentoRects(grid);
  const [id] = dashboardOrder.splice(fromIdx, 1);
  dashboardOrder.splice(toIdx, 0, id);
  applyBentoDomOrder(grid);
  playBentoFlip(grid, before);
  refreshBentoLabels(grid);
}

// El aria-label lleva la posición, así que hay que refrescarlo sin re-renderizar
// (un render nuevo mataría el arrastre en curso).
function refreshBentoLabels(grid) {
  const total = dashboardOrder.length;
  dashboardOrder.forEach((id, i) => {
    const el = grid.querySelector('#bento-' + id);
    if (el) el.setAttribute('aria-label', `${DASH_MODULES[id].label}, posición ${i + 1} de ${total}`);
  });
}

function onBentoPointerDown(e) {
  if (!dashboardEditing || bentoDrag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const item = e.target.closest('.bento-item');
  if (!item) return;
  const rect = item.getBoundingClientRect();
  bentoDrag = {
    pointerId: e.pointerId,
    item,
    id: item.dataset.module,
    startX: e.clientX, startY: e.clientY,
    grabDx: e.clientX - rect.left, grabDy: e.clientY - rect.top,
    width: rect.width, height: rect.height,
    lastX: e.clientX, lastY: e.clientY,
    active: false, raf: 0,
  };
  window.addEventListener('pointermove', onBentoPointerMove, { passive: false });
  window.addEventListener('pointerup', onBentoPointerUp);
  window.addEventListener('pointercancel', onBentoPointerUp);
}

function activateBentoDrag() {
  const d = bentoDrag;
  d.active = true;

  // La copia flota sobre la página; el original se queda ocupando su celda para
  // que la grilla siga teniendo nueve piezas y el hueco se pueda ver.
  const ghost = d.item.cloneNode(true);
  ghost.classList.add('bento-ghost');
  ghost.removeAttribute('tabindex');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  ghost.removeAttribute('id');
  ghost.style.width = d.width + 'px';
  ghost.style.height = d.height + 'px';
  document.body.appendChild(ghost);
  d.ghost = ghost;

  d.item.classList.add('placeholder');
  positionBentoDrag();
  if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) {} }
  d.raf = requestAnimationFrame(bentoEdgeScroll);
}

function positionBentoDrag() {
  const d = bentoDrag;
  if (!d.ghost) return;
  d.ghost.style.left = (d.lastX - d.grabDx) + 'px';
  d.ghost.style.top = (d.lastY - d.grabDy) + 'px';
}

// Sin esto no se puede mover un módulo más allá de lo que entra en pantalla,
// que en el celular es casi siempre.
function bentoEdgeScroll() {
  const d = bentoDrag;
  if (!d || !d.active) return;
  const y = d.lastY;
  const h = window.innerHeight;
  let dy = 0;
  if (y < BENTO_EDGE_PX) dy = -BENTO_EDGE_SPEED * (1 - y / BENTO_EDGE_PX);
  else if (y > h - BENTO_EDGE_PX) dy = BENTO_EDGE_SPEED * (1 - (h - y) / BENTO_EDGE_PX);
  if (dy) {
    window.scrollBy(0, dy);
    maybeReorderBento(d.lastX, d.lastY);
  }
  d.raf = requestAnimationFrame(bentoEdgeScroll);
}

function onBentoPointerMove(e) {
  const d = bentoDrag;
  if (!d || e.pointerId !== d.pointerId) return;
  d.lastX = e.clientX;
  d.lastY = e.clientY;
  if (!d.active) {
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < BENTO_DRAG_START_PX) return;
    activateBentoDrag();
  }
  e.preventDefault();
  positionBentoDrag();
  maybeReorderBento(e.clientX, e.clientY);
}

function maybeReorderBento(clientX, clientY) {
  const d = bentoDrag;
  const grid = bentoGrid();
  if (!d || !grid) return;
  const gridRect = grid.getBoundingClientRect();
  const px = clientX - gridRect.left;
  const py = clientY - gridRect.top;

  // offsetLeft/offsetTop ignoran los transform, así que dan la posición ya
  // asentada aunque el módulo esté animándose: sin esto, arrastrar rápido
  // mediría contra posiciones a mitad de camino.
  let hit = null;
  Array.from(grid.children).forEach(child => {
    if (hit || child === d.item) return;
    const l = child.offsetLeft, t = child.offsetTop;
    const w = child.offsetWidth, h = child.offsetHeight;
    if (px >= l && px <= l + w && py >= t && py <= t + h) hit = { child, l, t, w, h };
  });
  if (!hit) return;

  // Se compara contra el centro por el eje donde el puntero está más lejos, así
  // la misma regla sirve para vecinos de al lado y para módulos de otra fila.
  const dxNorm = (px - (hit.l + hit.w / 2)) / hit.w;
  const dyNorm = (py - (hit.t + hit.h / 2)) / hit.h;
  const after = Math.abs(dxNorm) > Math.abs(dyNorm) ? dxNorm > 0 : dyNorm > 0;

  const from = dashboardOrder.indexOf(d.id);
  const targetIdx = dashboardOrder.indexOf(hit.child.dataset.module);
  if (from === -1 || targetIdx === -1) return;
  let to = after ? targetIdx + 1 : targetIdx;
  if (from < to) to -= 1;
  if (to === from) return;
  moveModuleTo(from, to);
}

function onBentoPointerUp(e) {
  const d = bentoDrag;
  if (!d || e.pointerId !== d.pointerId) return;
  window.removeEventListener('pointermove', onBentoPointerMove);
  window.removeEventListener('pointerup', onBentoPointerUp);
  window.removeEventListener('pointercancel', onBentoPointerUp);
  if (d.raf) cancelAnimationFrame(d.raf);
  bentoDrag = null;
  if (d.active) settleBentoDrag(d);
}

// El hueco ya está en el lugar final, así que soltar es sólo llevar la copia
// flotante hasta ahí y devolverle el puesto al original.
function settleBentoDrag(d) {
  const { item, id, ghost } = d;
  const grid = bentoGrid();
  if (!grid) return;

  // Si se suelta mientras el hueco todavía se está acomodando, su rect incluiría
  // esa animación a medio camino; offsetLeft/offsetTop dan el destino real.
  const gridRect = grid.getBoundingClientRect();
  const slotLeft = gridRect.left + item.offsetLeft;
  const slotTop = gridRect.top + item.offsetTop;
  const now = ghost.getBoundingClientRect();

  ghost.classList.add('landing');
  ghost.style.transition = `transform ${BENTO_FLIP_MS}ms ${BENTO_FLIP_EASE}`;
  ghost.style.transform = `translate(${slotLeft - now.left}px, ${slotTop - now.top}px)`;

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    ghost.remove();
    item.classList.remove('placeholder');
  };
  ghost.addEventListener('transitionend', (e) => { if (e.target === ghost) finish(); });
  // Red de seguridad: si la transición no llega a dispararse, el módulo no
  // puede quedarse invisible.
  setTimeout(finish, BENTO_FLIP_MS + 150);

  const idx = dashboardOrder.indexOf(id);
  announce(`${DASH_MODULES[id].label} quedó en la posición ${idx + 1} de ${dashboardOrder.length}.`);
}

function onBentoKeyDown(e) {
  if (!dashboardEditing) return;
  if (!e.ctrlKey && !e.metaKey) return;
  let delta = 0;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') delta = -1;
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') delta = 1;
  else return;
  const item = e.target.closest('.bento-item');
  if (!item) return;
  const from = dashboardOrder.indexOf(item.dataset.module);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= dashboardOrder.length) return;
  e.preventDefault();
  moveModuleTo(from, to);
  item.focus();
  announce(`${DASH_MODULES[item.dataset.module].label}, posición ${to + 1} de ${dashboardOrder.length}.`);
}
