export const MAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const MAP_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

export const LOCATION_MODES = Object.freeze({
  PICKUP: 'pickup',
  DESTINATION: 'destination',
  INCIDENT: 'incident'
});

export const ROUTE_COLORS = Object.freeze({
  recommended: 'var(--recommended)',
  alternative: 'var(--alternative)',
  selected: 'var(--emergency)',
  reroute: 'var(--caution)'
});
