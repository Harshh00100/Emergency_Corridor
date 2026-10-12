import { isValidGeometry, measureGeometry } from '../../../utils/geometry';

export const calculateGeometryDistance = (geometry) => measureGeometry(geometry).total;

export const isValidRoute = (route) => Boolean(route && typeof route.id === 'string' &&
  Number.isFinite(route.distanceMeters) && route.distanceMeters > 0 &&
  Number.isFinite(route.durationSeconds) && route.durationSeconds > 0 && isValidGeometry(route.geometry));

export const normalizeMetric = (value, values) => {
  const finiteValues = values.filter(Number.isFinite);
  if (!Number.isFinite(value) || finiteValues.length < 2) return 0;
  const minimum = Math.min(...finiteValues);
  const maximum = Math.max(...finiteValues);
  if (maximum === minimum) return 0;
  return (value - minimum) / (maximum - minimum);
};

export const calculateRemainingDistance = (route, progressMeters) => {
  const total = route?.distanceMeters || 0;
  return Math.max(0, total - Math.max(0, progressMeters || 0));
};
