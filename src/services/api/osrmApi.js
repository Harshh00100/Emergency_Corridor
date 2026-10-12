import { endpoints } from './endpoints';
import { requestJson } from './httpClient';
import { ApiError } from '../errors/ApiError';
import { isValidCoordinate } from '../../utils/coordinates';
import { haversineDistanceMeters, isValidGeometry } from '../../utils/geometry';

const validateRouteResponse = (payload) => {
  if (!payload || payload.code !== 'Ok' || !Array.isArray(payload.routes) || payload.routes.length === 0) {
    throw new ApiError('No valid driving routes were returned.', { code: 'INVALID_RESPONSE' });
  }

  const validRoutes = payload.routes.filter((route) => (
    route && Number.isFinite(route.distance) && route.distance > 0 &&
    Number.isFinite(route.duration) && route.duration > 0 && isValidGeometry(route.geometry)
  ));

  if (validRoutes.length === 0) {
    throw new ApiError('The route response did not contain usable geometry.', { code: 'INVALID_RESPONSE' });
  }
  return validRoutes;
};

export const getRoutes = async ({ origin, destination, alternatives = true, signal }) => {
  if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
    throw new ApiError('Pickup and destination coordinates are required.', { code: 'INVALID_COORDINATES' });
  }
  if (haversineDistanceMeters(origin, destination) < 30) {
    throw new ApiError('Select endpoints at least 30 metres apart.', { code: 'INVALID_COORDINATES' });
  }

  const coordinatePath = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const query = new URLSearchParams({
    alternatives: alternatives ? 'true' : 'false',
    overview: 'full',
    geometries: 'geojson',
    steps: 'false'
  });
  const payload = await requestJson(`${endpoints.osrmRoute}/${coordinatePath}?${query.toString()}`, { signal });
  return validateRouteResponse(payload).map((route, index) => ({
    id: `osrm-${index + 1}`,
    label: `Corridor ${index + 1}`,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry,
    source: 'osrm'
  }));
};
