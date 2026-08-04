/* Iconos de línea, dibujados sobre una grilla de 24 y heredando el color del
   texto (currentColor), así el mismo icono sirve en tema claro, oscuro y sobre
   los botones de acento sin tener que versionarlo. */

const ICON_PATHS = {
  home:      '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9.5 21v-7h5v7"/>',
  logout:    '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
  moon:      '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  sun:       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  coffee:    '<path d="M17 8h1a3 3 0 0 1 0 6h-1"/><path d="M3 8h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M7 2v2M11 2v2"/>',
  cash:      '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  chart:     '<path d="M3 20h18"/><path d="M7 20v-6M12 20v-11M17 20v-8"/>',
  clipboard: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z"/><path d="M16 6h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><path d="M8.5 12h7M8.5 16h4"/>',
  utensils:  '<path d="M4 2v6a3 3 0 0 0 3 3 3 3 0 0 0 3-3V2"/><path d="M7 11v11"/><path d="M19 2c-1.9 1.3-3 3.5-3 5.8V14h3"/><path d="M19 2v20"/>',
  pencil:    '<path d="m15 5 4 4"/><path d="M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16Z"/>',
  check:     '<path d="m5 13 4 4L19 7"/>',
  calendar:  '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  cake:      '<path d="M6 12h12l-1.4 8H7.4z"/><path d="M6.6 12A3 3 0 0 1 7 6.4 3.5 3.5 0 0 1 12 4a3.5 3.5 0 0 1 5 2.4 3 3 0 0 1 .4 5.6"/>',
  pie:       '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4 6.4"/>',
  undo:      '<path d="m9 14-5-5 5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/>',
  sliders:   '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
  close:     '<path d="m6 6 12 12M18 6 6 18"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  arrowRight:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  arrowUp:   '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
  minus:     '<path d="M5 12h14"/>',
};

// Los puntos del asa se leen mejor macizos que delineados.
const ICON_FILLED = {
  grip: '<circle cx="9" cy="5.5" r="1.5"/><circle cx="15" cy="5.5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18.5" r="1.5"/><circle cx="15" cy="18.5" r="1.5"/>',
};

// Siempre decorativos: el texto del botón o su aria-label es lo que se anuncia.
function icon(name, size) {
  const s = size || 18;
  const filled = ICON_FILLED[name];
  const body = filled || ICON_PATHS[name] || '';
  const paint = filled
    ? 'fill="currentColor" stroke="none"'
    : 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg class="icon" viewBox="0 0 24 24" width="${s}" height="${s}" ${paint} aria-hidden="true" focusable="false">${body}</svg>`;
}
