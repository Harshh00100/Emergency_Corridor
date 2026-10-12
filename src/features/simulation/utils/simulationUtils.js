import { calculateRemainingDistance } from '../../routing/utils/routeMetrics';
import { measureGeometry } from '../../../utils/geometry';
import { DEFAULT_SIMULATION_SPEED } from '../../../constants/scoring';

export const getSimulationProgress = (route, progressMeters, speedKph = DEFAULT_SIMULATION_SPEED) => {
  const total = route?.distanceMeters || 0;
  const remainingDistanceMeters = calculateRemainingDistance(route, progressMeters);
  return {
    progress: total ? Math.min(1, Math.max(0, progressMeters / total)) : 0,
    remainingDistanceMeters,
    remainingTimeSeconds: remainingDistanceMeters / (Math.max(1, speedKph) / 3.6)
  };
};

// OSRM distance and geometry length can differ. Map progress proportionally onto
// cumulative geodesic segment lengths, never onto a uniform vertex index.
export const getPointAlongRoute = (route, progressMeters, measurement = measureGeometry(route?.geometry)) => {
  const coordinates = route?.geometry?.coordinates;
  if (!coordinates?.length || !measurement.total || !Number.isFinite(route.distanceMeters) || route.distanceMeters <= 0) return null;
  const fraction = Math.min(1, Math.max(0, progressMeters / route.distanceMeters));
  if (fraction === 1) {
    const [lng, lat] = coordinates[coordinates.length - 1];
    return { lat, lng };
  }
  const targetDistance = fraction * measurement.total;
  const { cumulative } = measurement;
  let low = 1;
  let high = cumulative.length - 1;
  while (low < high) {
    const midpoint = Math.floor((low + high) / 2);
    if (cumulative[midpoint] < targetDistance) low = midpoint + 1;
    else high = midpoint;
  }
  const segmentLength = cumulative[low] - cumulative[low - 1];
  const ratio = segmentLength ? (targetDistance - cumulative[low - 1]) / segmentLength : 0;
  const start = coordinates[low - 1];
  const end = coordinates[low];
  return { lat: start[1] + (end[1] - start[1]) * ratio, lng: start[0] + (end[0] - start[0]) * ratio };
};
