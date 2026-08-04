/* Pronóstico de San Isidro. Open-Meteo es abierta: no hay API key que esconder,
   así que el pedido sale del navegador y el Worker ni se entera. */

const SAN_ISIDRO = { lat: -34.4708, lon: -58.5126 };

const WEATHER_TZ = 'America/Argentina/Buenos_Aires';

const WEATHER_DAYS = 7;

// Como el dato tampoco es del negocio, vive en el navegador igual que el tema
// o el orden del panel.
const WEATHER_CACHE_KEY = 'lospumas_weather_cache';

const WEATHER_TTL_MS = 30 * 60 * 1000;

// Los códigos WMO son 28 y muchos se dibujan igual; sólo importan los grupos.
const WMO_GROUPS = [
  { codes: [0],                                 icon: 'sun',      label: 'Despejado' },
  { codes: [1, 2],                              icon: 'cloudSun', label: 'Parcialmente nublado' },
  { codes: [3],                                 icon: 'cloud',    label: 'Nublado' },
  { codes: [45, 48],                            icon: 'fog',      label: 'Niebla' },
  { codes: [51, 53, 55, 56, 57],                icon: 'drizzle',  label: 'Llovizna' },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82],    icon: 'rain',     label: 'Lluvia' },
  { codes: [71, 73, 75, 77, 85, 86],            icon: 'snow',     label: 'Nieve' },
  { codes: [95, 96, 99],                        icon: 'storm',    label: 'Tormenta' },
];

const WMO_MAP = {};
WMO_GROUPS.forEach(g => g.codes.forEach(c => { WMO_MAP[c] = { icon: g.icon, label: g.label }; }));

function weatherLook(code) {
  return WMO_MAP[code] || { icon: 'cloud', label: 'Nublado' };
}

let weatherState = { status: 'idle', days: [], current: null, fetchedAt: 0 };

// Una sola request en vuelo: el módulo se re-dibuja varias veces (volver al
// panel, salir de personalizar) y cada render llama a ensureWeather().
let weatherInFlight = false;

function loadWeatherCache() {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || !Array.isArray(cached.days) || !cached.days.length) return null;
    return cached;
  } catch (e) {
    return null;
  }
}

function saveWeatherCache() {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
      days: weatherState.days,
      current: weatherState.current,
      fetchedAt: weatherState.fetchedAt,
    }));
  } catch (e) {}
}

function weatherUrl() {
  const params = new URLSearchParams({
    latitude: SAN_ISIDRO.lat,
    longitude: SAN_ISIDRO.lon,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    current: 'temperature_2m,weather_code',
    timezone: WEATHER_TZ,
    forecast_days: WEATHER_DAYS,
  });
  return 'https://api.open-meteo.com/v1/forecast?' + params;
}

// El pedido pide la hora local de Buenos Aires, así que daily.time[0] es hoy
// acá aunque el navegador esté en otro huso.
function normalizeWeather(data) {
  const d = data && data.daily;
  if (!d || !Array.isArray(d.time) || !d.time.length) throw new Error('bad_payload');
  const days = d.time.map((dateISO, i) => ({
    dateISO,
    code: d.weather_code[i],
    max: Math.round(d.temperature_2m_max[i]),
    min: Math.round(d.temperature_2m_min[i]),
    pop: d.precipitation_probability_max[i],
  }));
  const current = data.current
    ? { temp: Math.round(data.current.temperature_2m), code: data.current.weather_code }
    : null;
  return { days, current };
}

// onSettled se llama cada vez que cambia lo que habría que mostrar. Incluido el
// cache: quien llama ya dibujó el módulo antes de esto, así que hidratar desde
// localStorage también es un cambio que hay que avisar.
async function ensureWeather(onSettled) {
  if (weatherInFlight) return;

  if (weatherState.status === 'idle') {
    const cached = loadWeatherCache();
    if (cached) {
      weatherState = { status: 'ready', days: cached.days, current: cached.current, fetchedAt: cached.fetchedAt || 0 };
      if (onSettled) onSettled();
    }
  }

  const fresh = weatherState.status === 'ready' && (Date.now() - weatherState.fetchedAt) < WEATHER_TTL_MS;
  if (fresh) return;

  const hadData = weatherState.days.length > 0;
  weatherInFlight = true;
  // Con datos viejos en pantalla no se pasa a 'loading': mostrar el pronóstico
  // vencido un rato es mejor que parpadear a esqueleto.
  if (!hadData) {
    weatherState = { ...weatherState, status: 'loading' };
    if (onSettled) onSettled();
  }

  try {
    const res = await fetch(weatherUrl());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const { days, current } = normalizeWeather(await res.json());
    weatherState = { status: 'ready', days, current, fetchedAt: Date.now() };
    saveWeatherCache();
  } catch (e) {
    // Si había cache vencido se lo deja en pantalla: un pronóstico de hace unas
    // horas dice más que un cartel de error.
    weatherState = hadData
      ? { ...weatherState, status: 'ready' }
      : { status: 'error', days: [], current: null, fetchedAt: 0 };
  } finally {
    weatherInFlight = false;
  }
  if (onSettled) onSettled();
}

// Reintentar tiene que volver a pedir sí o sí, aunque el cache todavía no haya
// vencido.
function retryWeather(onSettled) {
  weatherState = { status: 'idle', days: [], current: null, fetchedAt: 0 };
  ensureWeather(onSettled);
}
