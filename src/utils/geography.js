import { isValidCoordinate } from './coordinates';
import { haversineDistanceMeters } from './geometry';

export const distanceBetweenCoordinates = (first, second) => {
  if (!isValidCoordinate(first) || !isValidCoordinate(second)) return Infinity;
  return haversineDistanceMeters(first, second);
};

export const sortByDistanceFrom = (items, origin) => items
  .map((item) => ({ ...item, distanceMeters: distanceBetweenCoordinates(origin, item) }))
  .filter((item) => Number.isFinite(item.distanceMeters))
  .sort((first, second) => first.distanceMeters - second.distanceMeters);
