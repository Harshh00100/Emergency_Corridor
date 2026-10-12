export const TEST_ROUTES = [
  { id: 'r1', label: 'Corridor 1', distanceMeters: 5000, durationSeconds: 300, source: 'osrm', geometry: { type: 'LineString', coordinates: [[77.209, 28.6139], [77.2095, 28.59], [77.21, 28.5672]] } },
  { id: 'r2', label: 'Corridor 2', distanceMeters: 6500, durationSeconds: 410, source: 'osrm', geometry: { type: 'LineString', coordinates: [[77.209, 28.6139], [77.235, 28.59], [77.21, 28.5672]] } }
];

export const TEST_OSRM_RESPONSE = { code: 'Ok', routes: TEST_ROUTES.map((route) => ({ distance: route.distanceMeters, duration: route.durationSeconds, geometry: route.geometry })) };
export const TEST_HOSPITAL_RESPONSE = { elements: [{ type: 'node', id: 1, lat: 28.5672, lon: 77.21, tags: { name: 'Fixture Hospital', amenity: 'hospital', 'addr:street': 'Fixture Road' } }] };
