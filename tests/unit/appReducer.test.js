import { describe, expect, it } from 'vitest';
import { appReducer, initialState } from '../../src/state/appReducer';
import { TEST_ROUTES } from '../../src/test/fixtures/routes';

const readyState = appReducer(initialState, { type: 'ROUTES_RECEIVED', payload: { routes: TEST_ROUTES, source: 'osrm' } });

describe('application reducer', () => {
  it('stores endpoints and resets the active simulation', () => {
    const running = appReducer(readyState, { type: 'START_SIMULATION', payload: { routeId: 'r1' } });
    const next = appReducer(running, { type: 'SET_PICKUP', payload: { lat: 28.6, lng: 77.2 } });
    expect(next.locations.pickup.lat).toBe(28.6);
    expect(next.simulation.status).toBe('idle');
  });

  it('supports start, pause, resume, tick, and reset simulation transitions', () => {
    let state = appReducer(readyState, { type: 'START_SIMULATION', payload: { routeId: 'r1' } });
    state = appReducer(state, { type: 'TICK_SIMULATION', payload: { routeDistanceMeters: 1000, distanceIncrementMeters: 250 } });
    expect(state.simulation.progressMeters).toBe(250);
    state = appReducer(state, { type: 'PAUSE_SIMULATION' });
    expect(state.simulation.status).toBe('paused');
    state = appReducer(state, { type: 'RESUME_SIMULATION' });
    state = appReducer(state, { type: 'TICK_SIMULATION', payload: { distanceIncrementMeters: 5000 } });
    expect(state.simulation.status).toBe('completed');
    state = appReducer(state, { type: 'RESET_SIMULATION' });
    expect(state.simulation.progressMeters).toBe(0);
    expect(state.simulation.status).toBe('idle');
  });

  it('records incidents in state and history', () => {
    const next = appReducer(initialState, { type: 'ADD_INCIDENT', payload: { id: 'i1', type: 'blockage', severity: 'high', lat: 28.6, lng: 77.2, radiusMeters: 250 } });
    expect(next.incidents).toHaveLength(1);
    expect(next.history[0].label).toContain('blockage');
  });

  it('rejects missing routes, invalid incident input, and invalid speed', () => {
    expect(appReducer(initialState, { type: 'START_SIMULATION', payload: { routeId: 'missing' } }).simulation.status).toBe('idle');
    expect(appReducer(initialState, { type: 'ADD_INCIDENT', payload: {} }).incidents).toHaveLength(0);
    expect(appReducer(initialState, { type: 'SET_SIMULATION_SPEED', payload: -4 }).simulation.speedKph).toBe(55);
    expect(appReducer(initialState, { type: 'RESUME_SIMULATION' })).toBe(initialState);
  });

  it('clears stale geometry when endpoints change and pauses a confirmed route switch at pickup', () => {
    let state = appReducer(readyState, { type: 'START_SIMULATION', payload: { routeId: 'r1' } });
    state = appReducer(state, { type: 'TICK_SIMULATION', payload: { distanceIncrementMeters: 100 } });
    state = appReducer(state, { type: 'SWITCH_SIMULATION_ROUTE', payload: { routeId: 'r2' } });
    expect(state.simulation).toMatchObject({ status: 'paused', routeId: 'r2', progressMeters: 0 });
    state = appReducer(state, { type: 'SET_DESTINATION', payload: null });
    expect(state.routing.routes).toHaveLength(0);
    expect(state.simulation.status).toBe('idle');
  });
});
