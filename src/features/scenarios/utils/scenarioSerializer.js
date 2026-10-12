import { isValidCoordinate } from '../../../utils/coordinates';
import { isValidRoute } from '../../routing/utils/routeMetrics';
import { SIMULATION_SPEED_OPTIONS } from '../../../constants/scoring';
import { scoreRoutes } from '../../routing/utils/routeScoring';

export const SCENARIO_VERSION = 1;
export const MAX_SCENARIO_BYTES = 2 * 1024 * 1024;
export const MAX_CHECKPOINTS = 180;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const text = (value, fallback = '') => typeof value === 'string' ? value.slice(0, 1000) : fallback;
const list = (value, limit, label) => {
  assert(Array.isArray(value) && value.length <= limit, `Invalid or oversized ${label}.`);
  return value;
};
const point = (value) => {
  if (value === null) return null;
  assert(isValidCoordinate(value), 'Invalid scenario coordinates.');
  return { lat: value.lat, lng: value.lng, label: text(value.label), ...(value.hospitalId ? { hospitalId: text(value.hospitalId) } : {}) };
};
const incidents = (value) => list(value, 100, 'incident list').map((item) => {
  assert(item && isValidCoordinate(item) && typeof item.id === 'string' &&
    ['blockage', 'accident', 'congestion'].includes(item.type) && ['low', 'medium', 'high'].includes(item.severity) &&
    Number.isFinite(item.radiusMeters) && item.radiusMeters > 0 && item.radiusMeters <= 100000, 'Invalid scenario incident.');
  return { id: item.id.slice(0, 100), lat: item.lat, lng: item.lng, type: item.type, severity: item.severity, radiusMeters: item.radiusMeters };
});
const simulation = (value, routes) => {
  assert(value && ['idle', 'running', 'paused', 'completed'].includes(value.status) && SIMULATION_SPEED_OPTIONS.includes(value.speedKph), 'Invalid simulation settings.');
  const route = routes.find((item) => item.id === value.routeId);
  assert(value.routeId === null || route, 'The saved simulation references a missing route.');
  assert(value.status === 'idle' || route, 'An active simulation needs a saved route.');
  assert(Number.isFinite(value.progressMeters) && value.progressMeters >= 0 && value.progressMeters <= (route?.distanceMeters || 0), 'Invalid simulation progress.');
  return { status: value.status, routeId: value.routeId, speedKph: value.speedKph, progressMeters: value.progressMeters };
};
const places = (value) => {
  assert(value && ['none', 'demo', 'openstreetmap'].includes(value.source), 'Invalid place data source.');
  const items = list(value.items, 500, 'place list').map((item) => {
    assert(item && isValidCoordinate(item) && typeof item.id === 'string', 'Invalid saved place.');
    return { id: item.id, lat: item.lat, lng: item.lng, name: text(item.name), address: text(item.address), roadName: text(item.roadName), source: value.source };
  });
  return { items, source: value.source, status: value.source === 'none' ? 'idle' : 'success', error: null, fallbackReason: text(value.fallbackReason) || null };
};

// Whitelist fields at the import boundary. Never spread untrusted JSON into state.
export const validateScenario = (value) => {
  assert(value && value.version === SCENARIO_VERSION, 'Unsupported scenario version. This app supports version 1.');
  assert(typeof value.savedAt === 'string' && Number.isFinite(Date.parse(value.savedAt)), 'Invalid scenario save date.');
  const data = value.snapshot;
  assert(data?.locations && data.routing, 'This file does not contain a scenario snapshot.');
  const routes = list(data.routing.routes, 10, 'route list').map((route) => {
    assert(isValidRoute(route) && route.geometry.coordinates.length <= 20000, 'Invalid or oversized route geometry.');
    assert(route.simulatedCongestion === undefined || (Number.isFinite(route.simulatedCongestion) && route.simulatedCongestion >= 0 && route.simulatedCongestion <= 1), 'Invalid simulated congestion.');
    return { id: route.id.slice(0, 100), label: text(route.label), distanceMeters: route.distanceMeters, durationSeconds: route.durationSeconds,
      geometry: { type: 'LineString', coordinates: route.geometry.coordinates.map(([lng, lat]) => [lng, lat]) },
      ...(route.simulatedCongestion !== undefined ? { simulatedCongestion: route.simulatedCongestion } : {}) };
  });
  assert(new Set(routes.map((route) => route.id)).size === routes.length, 'Route IDs must be unique.');
  const routeId = (id) => { assert(id === null || routes.some((route) => route.id === id), 'Selected route is missing.'); return id; };
  assert(['none', 'osrm', 'demo'].includes(data.routing.source) && (!routes.length || data.routing.source !== 'none'), 'Invalid route data source.');
  const locations = { pickup: point(data.locations.pickup), destination: point(data.locations.destination) };
  assert(!routes.length || (locations.pickup && locations.destination), 'Saved routes need both endpoints.');
  const history = list(data.history, 40, 'history').map((event, index) => {
    assert(event && Number.isFinite(Date.parse(event.timestamp)), 'Invalid history timestamp.');
    return { id: index + 1, label: text(event.label), detail: text(event.detail), timestamp: event.timestamp };
  });
  let previousTime = -1;
  const recording = list(value.recording || [], MAX_CHECKPOINTS, 'replay recording').map((frame) => {
    assert(routes.length && frame && Number.isFinite(frame.at) && frame.at >= 0 && frame.at >= previousTime && frame.at <= 8640000000000000, 'Invalid replay timeline.');
    previousTime = frame.at;
    return { at: frame.at, simulation: simulation(frame.simulation, routes), incidents: incidents(frame.incidents), selectedRouteId: routeId(frame.selectedRouteId) };
  });
  return { version: SCENARIO_VERSION, name: text(value.name, 'Untitled scenario').slice(0, 80), savedAt: text(value.savedAt), recording,
    snapshot: { locations, offlineMode: data.offlineMode === true,
      routing: { routes, selectedRouteId: routeId(data.routing.selectedRouteId), source: data.routing.source, status: routes.length ? 'success' : 'idle', error: null, fallbackReason: text(data.routing.fallbackReason) || null },
      incidents: incidents(data.incidents), simulation: simulation(data.simulation, routes), history,
      hospitals: places(data.hospitals), trafficSignals: places(data.trafficSignals) } };
};

export const createScenario = (state, name = 'Untitled scenario') => {
  let recording = state.recording || [];
  const last = recording.at(-1);
  if (last && (last.simulation.progressMeters !== state.simulation.progressMeters || last.simulation.status !== state.simulation.status)) {
    recording = [...recording, { at: Math.max(Date.now(), last.at), simulation: state.simulation, incidents: state.incidents, selectedRouteId: state.routing.selectedRouteId }].slice(-MAX_CHECKPOINTS);
  }
  return validateScenario({
    version: SCENARIO_VERSION, name, savedAt: new Date().toISOString(), recording,
    snapshot: { locations: state.locations, offlineMode: state.offlineMode, routing: state.routing, incidents: state.incidents,
      simulation: state.simulation, history: state.history, hospitals: state.hospitals, trafficSignals: state.trafficSignals }
  });
};

export const parseScenario = (json) => {
  assert(typeof json === 'string' && new Blob([json]).size <= MAX_SCENARIO_BYTES, 'Scenario files must be smaller than 2 MB.');
  let parsed;
  try { parsed = JSON.parse(json); } catch { throw new Error('The scenario file is not valid JSON.'); }
  return validateScenario(parsed);
};

export const serializeScenario = (scenario) => {
  const json = JSON.stringify(validateScenario(scenario));
  assert(new Blob([json]).size <= MAX_SCENARIO_BYTES, 'This scenario exceeds the 2 MB limit. Start a shorter recording.');
  return json;
};

const toBase64 = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const createShareUrl = async (scenario, currentUrl = window.location.href) => {
  const bytes = new TextEncoder().encode(serializeScenario(scenario));
  const compressed = typeof CompressionStream !== 'undefined';
  const payload = compressed ? new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()) : bytes;
  const url = new URL(currentUrl);
  url.searchParams.delete('scenario');
  url.hash = `scenario=${compressed ? 'gz' : 'raw'}.${toBase64(payload)}`;
  assert(url.href.length <= 24000, 'This recording is too large for a share link. Use Export JSON to share the complete scenario.');
  return url.href;
};

export const readShareUrl = async (value) => {
  const parameter = value.startsWith('#scenario=') ? value.slice(10) : value;
  assert(parameter.length <= 24000, 'Invalid or oversized scenario link.');
  const [encoding, encoded] = parameter.split('.');
  assert(['gz', 'raw'].includes(encoding) && encoded && /^[\w-]+$/.test(encoded), 'Invalid scenario link encoding.');
  let bytes;
  try { bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0)); }
  catch { throw new Error('The scenario link could not be decoded.'); }
  if (encoding === 'gz') {
    assert(typeof DecompressionStream !== 'undefined', 'This browser cannot open compressed scenario links. Import the JSON file instead.');
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        assert(size <= MAX_SCENARIO_BYTES, 'The shared scenario exceeds the 2 MB limit.');
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
  }
  return parseScenario(new TextDecoder().decode(bytes));
};

export const createRunSummary = (scenario) => {
  const { snapshot } = scenario;
  const routes = scoreRoutes(snapshot.routing.routes, snapshot.incidents);
  return {
    title: scenario.name, exportedAt: new Date().toISOString(), dataSource: snapshot.routing.source,
    pickup: snapshot.locations.pickup, destination: snapshot.locations.destination,
    selectedRoute: snapshot.simulation.routeId || snapshot.routing.selectedRouteId || routes[0]?.id || null,
    recommendation: routes[0]?.id || null, simulation: snapshot.simulation,
    routes: routes.map(({ id, label, distanceMeters, durationSeconds, adjustedDurationSeconds, score }) => ({ id, label, distanceMeters, baselineSeconds: durationSeconds, adjustedSeconds: adjustedDurationSeconds, score })),
    incidents: snapshot.incidents, history: [...snapshot.history].reverse(), checkpoints: scenario.recording.length
  };
};
