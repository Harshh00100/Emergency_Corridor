export const isValidCoordinate = (coordinate) => (
  coordinate &&
  Number.isFinite(coordinate.lat) &&
  Number.isFinite(coordinate.lng) &&
  coordinate.lat >= -90 &&
  coordinate.lat <= 90 &&
  coordinate.lng >= -180 &&
  coordinate.lng <= 180
);
