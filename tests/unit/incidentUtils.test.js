import { describe, expect, it } from 'vitest';
import { calculateIncidentPenalty, distanceToRouteMeters } from '../../src/features/incidents/utils/incidentUtils';

const route = {
  geometry: { type: 'LineString', coordinates: [[77.2, 28.6], [77.21, 28.61]] }
};

describe('incident penalties', () => {
  it('calculates distance to a route geometry', () => {
    expect(distanceToRouteMeters(route, { lat: 28.605, lng: 77.205 })).toBeLessThan(1000);
  });

  it('ignores events outside their impact radius', () => {
    const result = calculateIncidentPenalty(route, [{ type: 'blockage', severity: 'high', lat: 29, lng: 78, radiusMeters: 100 }]);
    expect(result.affectedIncidents).toHaveLength(0);
    expect(result.incidentPenalty).toBe(0);
  });

  it('separates congestion and hard incident penalties', () => {
    const result = calculateIncidentPenalty(route, [
      { type: 'congestion', severity: 'medium', lat: 28.605, lng: 77.205, radiusMeters: 1000 },
      { type: 'blockage', severity: 'low', lat: 28.605, lng: 77.205, radiusMeters: 1000 }
    ]);
    expect(result.congestionPenalty).toBeGreaterThan(0);
    expect(result.incidentPenalty).toBeGreaterThan(0);
  });
});
