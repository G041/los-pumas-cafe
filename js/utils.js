const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  lines.shift(); // header
  return lines.map(line => {
    const [date, C, V, F, T, opening, final, platos, fiscal] = line.split(',');
    const Cn = Number(C), Vn = Number(V), Fn = Number(F);
    return {
      dateISO: date,
      C: Cn, V: Vn, F: Fn, T: Number(T),
      s3: Cn + Vn + Fn,
      opening: Number(opening),
      final: Number(final),
      platos: parseInt(platos, 10),
      fiscal: Number(fiscal),
    };
  });
}

function fmt(n) { return Number(n).toLocaleString('es-AR'); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// nombre/categoria are free text and may contain commas, so platos.csv is
// quoted-CSV — mirrors worker/src/index.js parseCSVLine/csvEscapeField.
function parseCSVLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      fields.push(field);
      field = '';
    } else {
      field += c;
    }
  }
  fields.push(field);
  return fields;
}

function parsePlatosCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  lines.shift(); // header
  return lines.map(line => {
    const [nombre, categoria, ultimaFecha, ultimoPrecio] = parseCSVLine(line);
    return { nombre, categoria, ultimaFecha, ultimoPrecio: Number(ultimoPrecio) };
  });
}

function toDisplayDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

function isoToday() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function prevIsoDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function isFirstOfMonth(iso) { return Number(iso.split('-')[2]) === 1; }

// Wraps each selected tart type in {} and joins them the way a spoken Spanish
// list would: commas between all but the last, "o" before the last one.
function joinTartaTypes(types) {
  const braced = types.map(t => `{${t}}`);
  if (braced.length === 0) return '';
  if (braced.length === 1) return braced[0];
  return braced.slice(0, -1).join(', ') + ' o ' + braced[braced.length - 1];
}

function normalizeName(s) {
  return String(s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch (e) {
    return false;
  }
}
