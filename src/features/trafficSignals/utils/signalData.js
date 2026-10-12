import { isValidCoordinate } from '../../../utils/coordinates';

export const transformTrafficSignalElement = (element) => {
  if (!element || element.type !== 'node' || !Number.isFinite(element.id)) return null;
  const coordinate = { lat: element.lat, lng: element.lon };
  if (!isValidCoordinate(coordinate) || element.tags?.highway !== 'traffic_signals') return null;
  const tags = Object.fromEntries(Object.entries(element.tags || {}).filter(([, value]) => typeof value === 'string'));
  return {
    id: `osm-signal-${element.id}`,
    name: tags.name || `Traffic signal ${element.id}`,
    ...coordinate,
    roadName: tags['name:en'] || tags.ref || tags.name || 'Road junction not named',
    source: 'openstreetmap',
    tags
  };
};
