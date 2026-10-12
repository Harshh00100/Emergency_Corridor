import { calculateGeometryDistance } from './routeMetrics';

const createGeometry = (origin, destination, offsets) => {
  const latDelta = destination.lat - origin.lat;
  const lngDelta = destination.lng - origin.lng;
  const points = [
    [origin.lng, origin.lat],
    ...offsets.map(([ratio, latOffset, lngOffset]) => [
      origin.lng + lngDelta * ratio + lngOffset,
      origin.lat + latDelta * ratio + latOffset
    ]),
    [destination.lng, destination.lat]
  ];
  return { type: 'LineString', coordinates: points };
};

const createDemoRoute = (origin, destination, id, label, offsets, speedKph, congestion) => {
  const geometry = createGeometry(origin, destination, offsets);
  const distanceMeters = calculateGeometryDistance(geometry);
  return {
    id,
    label,
    geometry,
    distanceMeters,
    durationSeconds: (distanceMeters / 1000 / speedKph) * 3600,
    simulatedCongestion: congestion,
    source: 'demo'
  };
};

export const buildDemoRoutes = (origin, destination) => [
  createDemoRoute(origin, destination, 'demo-direct', 'Sample corridor A', [[0.32, 0.006, 0.003], [0.66, -0.004, -0.002]], 39, 0.32),
  createDemoRoute(origin, destination, 'demo-ring', 'Sample corridor B', [[0.25, -0.012, 0.014], [0.55, -0.018, 0.022], [0.78, -0.008, 0.012]], 45, 0.18),
  createDemoRoute(origin, destination, 'demo-local', 'Sample corridor C', [[0.2, 0.01, -0.016], [0.48, 0.02, -0.02], [0.77, 0.013, -0.014]], 32, 0.46)
];
