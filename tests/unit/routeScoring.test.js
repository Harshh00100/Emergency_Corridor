import { describe, expect, it } from 'vitest';
import { scoreRoutes, explainRouteDecision } from '../../src/features/routing/utils/routeScoring';
import { normalizeMetric } from '../../src/features/routing/utils/routeMetrics';

const route = (id, distanceMeters, durationSeconds, congestion = 0.2) => ({
  id,
  label: id,
  distanceMeters,
  durationSeconds,
  simulatedCongestion: congestion,
  geometry: { type: 'LineString', coordinates: [[77.2, 28.6], [77.21, 28.61]] }
});

describe('route scoring', () => {
  it('uses min-max normalization including equal candidates and missing input', () => {
    expect(normalizeMetric(20, [10, 20, 30])).toBe(0.5);
    expect(normalizeMetric(20, [20, 20])).toBe(0);
    expect(scoreRoutes(null)).toEqual([]);
    expect(scoreRoutes([null, {}, { ...route('bad', -2, 5), geometry: null }])).toEqual([]);
  });

  it('supports distance-only weighting and rejects invalid weights', () => {
    const routes = [route('short-slow', 100, 900), route('long-fast', 200, 300)];
    const weights = { distance: 1, travelTime: 0, congestion: 0, incidents: 0 };
    expect(scoreRoutes(routes, [], weights)[0]).toMatchObject({ id: 'short-slow', score: 0 });
    expect(() => scoreRoutes(routes, [], { distance: -1 })).toThrow(/weights/);
  });
  it('normalizes candidate metrics and ranks the lower cost route first', () => {
    const scored = scoreRoutes([route('fast', 1200, 300, 0.2), route('slow', 3000, 900, 0.2)]);
    expect(scored).toHaveLength(2);
    expect(scored[0].id).toBe('fast');
    expect(scored[0].rank).toBe(1);
    expect(scored[0].score).toBeLessThan(scored[1].score);
  });

  it('applies a nearby blockage penalty and can change the recommendation', () => {
    const routes = [
      { ...route('north', 1000, 300, 0.1), geometry: { type: 'LineString', coordinates: [[77.2, 28.6], [77.21, 28.61]] } },
      { ...route('south', 1600, 410, 0.12), geometry: { type: 'LineString', coordinates: [[77.2, 28.58], [77.21, 28.59]] } }
    ];
    const baseline = scoreRoutes(routes);
    const impacted = scoreRoutes(routes, [{ id: 'i1', type: 'blockage', severity: 'high', lat: 28.605, lng: 77.205, radiusMeters: 1000 }]);
    expect(baseline[0].id).toBe('north');
    expect(impacted[0].id).toBe('south');
    expect(impacted.find((item) => item.id === 'north').affectedIncidents).toHaveLength(1);
  });

  it('returns a usable explanation for an empty route set', () => {
    expect(explainRouteDecision(null, [], [])).toContain('Select a pickup');
  });
});
