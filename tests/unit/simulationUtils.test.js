import { describe, expect, it } from 'vitest';
import { getPointAlongRoute, getSimulationProgress } from '../../src/features/simulation/utils/simulationUtils';

describe('geometry-aware movement', () => {
  const route = { distanceMeters: 1000, geometry: { type: 'LineString', coordinates: [[0, 0], [0.001, 0], [0.01, 0]] } };
  it('interpolates by segment length rather than vertex count', () => {
    expect(getPointAlongRoute(route, 500).lng).toBeCloseTo(0.005, 6);
    expect(getPointAlongRoute(route, 1200).lng).toBe(0.01);
    expect(getPointAlongRoute(route, -20).lng).toBe(0);
  });
  it('calculates remaining time from configured speed and clamps arrival', () => {
    expect(getSimulationProgress(route, 500, 36)).toMatchObject({ progress: 0.5, remainingDistanceMeters: 500, remainingTimeSeconds: 50 });
    expect(getSimulationProgress(route, 1500, 36).remainingTimeSeconds).toBe(0);
    expect(getPointAlongRoute(null, 0)).toBeNull();
  });
});
