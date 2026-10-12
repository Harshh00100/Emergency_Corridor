import { isValidCoordinate } from './coordinates';

const EARTH_RADIUS_METERS = 6371000;
const toRadians = (value) => value * Math.PI / 180;

export const haversineDistanceMeters = (first, second) => {
  const latDelta = toRadians(second.lat - first.lat);
  const lngDelta = toRadians(second.lng - first.lng);
  const value = Math.sin(latDelta / 2) ** 2 + Math.cos(toRadians(first.lat)) * Math.cos(toRadians(second.lat)) * Math.sin(lngDelta / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, value))));
};

export const isValidGeometry = (geometry) => geometry?.type === 'LineString' &&
  Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2 &&
  geometry.coordinates.every((pair) => Array.isArray(pair) && pair.length >= 2 && isValidCoordinate({ lat: pair[1], lng: pair[0] })) &&
  geometry.coordinates.some(([lng, lat]) => lng !== geometry.coordinates[0][0] || lat !== geometry.coordinates[0][1]);

export const measureGeometry = (geometry) => {
  if (!isValidGeometry(geometry)) return { cumulative: [], total: 0 };
  const cumulative = [0];
  for (let index = 1; index < geometry.coordinates.length; index += 1) {
    const [lng, lat] = geometry.coordinates[index];
    const [previousLng, previousLat] = geometry.coordinates[index - 1];
    cumulative.push(cumulative[index - 1] + haversineDistanceMeters({ lat, lng }, { lat: previousLat, lng: previousLng }));
  }
  return { cumulative, total: cumulative[cumulative.length - 1] };
};
