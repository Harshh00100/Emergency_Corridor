import { describe, expect, it, vi } from 'vitest';
import { appReducer, initialState } from '../../src/state/appReducer';
import { createScenario, createShareUrl, parseScenario, readShareUrl, serializeScenario, validateScenario, MAX_CHECKPOINTS } from '../../src/features/scenarios/utils/scenarioSerializer';
import { TEST_ROUTES } from '../../src/test/fixtures/routes';

const action = (type, payload, second = 0) => ({ type, payload, meta: { timestamp: new Date(1760000000000 + second * 1000).toISOString() } });
const ready = () => {
  let state = appReducer(initialState, action('SET_PICKUP', { lat: 28.6139, lng: 77.209 }));
  state = appReducer(state, action('SET_DESTINATION', { lat: 28.62, lng: 77.23 }));
  return appReducer(state, action('ROUTES_RECEIVED', { routes: TEST_ROUTES, source: 'osrm' }));
};

describe('portable scenarios', () => {
  it('round trips route geometry and progress, restores running work paused, and does not restore gateway receipts', () => {
    let state = appReducer(ready(), action('START_SIMULATION', { routeId: 'r1' }, 1));
    state = appReducer(state, action('TICK_SIMULATION', { distanceIncrementMeters: 200 }, 2));
    const exported = createScenario({ ...state, signalClearance: { status: 'accepted', receiptId: 'private' } }, 'Delhi drill');
    const restored = appReducer(initialState, action('LOAD_SCENARIO', parseScenario(serializeScenario(exported))));
    expect(restored.simulation).toMatchObject({ status: 'paused', routeId: 'r1', progressMeters: 200 });
    expect(restored.routing.routes[0].geometry).toEqual(TEST_ROUTES[0].geometry);
    expect(restored.scenarioName).toBe('Delhi drill');
    expect(restored.signalClearance.status).toBe('idle');
    expect(restored.recording.at(-1).simulation.progressMeters).toBe(200);
  });

  it('rejects malformed, future-version, dangling-route, oversized and invalid-progress imports', () => {
    const scenario = createScenario(ready());
    expect(() => parseScenario('{')).toThrow('valid JSON');
    expect(() => validateScenario({ ...scenario, version: 50 })).toThrow('version');
    const invalid = structuredClone(scenario);
    invalid.snapshot.routing.selectedRouteId = 'missing';
    expect(() => validateScenario(invalid)).toThrow('missing');
    invalid.snapshot.routing.selectedRouteId = null;
    invalid.snapshot.simulation.progressMeters = -5;
    expect(() => validateScenario(invalid)).toThrow('progress');
    expect(() => parseScenario(' '.repeat(2 * 1024 * 1024 + 1))).toThrow('2 MB');
    expect(() => validateScenario({ ...scenario, recording: [{ at: 0, incidents: [] }] })).toThrow();
    const empty = createScenario(initialState);
    empty.recording = [{ at: 0, incidents: [], simulation: initialState.simulation, selectedRouteId: null }];
    expect(() => validateScenario(empty)).toThrow('timeline');
  });

  it('keeps a bounded ordered replay of movement and incident changes and resets recording when endpoints change', () => {
    let state = appReducer(ready(), action('START_SIMULATION', { routeId: 'r1' }, 1));
    for (let index = 2; index < 210; index += 1) state = appReducer(state, action('TICK_SIMULATION', { distanceIncrementMeters: 1 }, index));
    expect(state.recording).toHaveLength(MAX_CHECKPOINTS);
    state = appReducer(state, action('ADD_INCIDENT', { id: 'event', type: 'blockage', severity: 'high', radiusMeters: 250, lat: 28.61, lng: 77.21 }, 211));
    expect(state.recording.at(-2).incidents).toHaveLength(0);
    expect(state.recording.at(-1).incidents).toHaveLength(1);
    const final = createScenario(state);
    expect(validateScenario(final).recording).toHaveLength(MAX_CHECKPOINTS);
    state = appReducer(state, action('SET_DESTINATION', null, 212));
    expect(state.recording).toHaveLength(0);
  });

  it('shares a self-contained compressed URL fragment with Unicode names', async () => {
    const scenario = createScenario(ready(), 'दिल्ली 🚑');
    const link = new URL(await createShareUrl(scenario, 'https://example.com/#dashboard'));
    expect(link.search).toBe('');
    const restored = await readShareUrl(link.hash);
    expect(restored.name).toBe('दिल्ली 🚑');
    expect(restored.snapshot.routing.routes).toEqual(scenario.snapshot.routing.routes);
    await expect(readShareUrl('#scenario=gz.invalid')).rejects.toThrow();
  });

  it('falls back to an uncompressed share link when compression is unavailable', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    try {
      const scenario = createScenario(ready());
      const link = new URL(await createShareUrl(scenario, 'https://example.com/'));
      expect(link.hash).toMatch(/^#scenario=raw\./);
      expect((await readShareUrl(link.hash)).name).toBe(scenario.name);
    } finally { vi.unstubAllGlobals(); }
  });
});
