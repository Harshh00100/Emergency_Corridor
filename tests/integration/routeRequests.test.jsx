import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStateProvider, useAppState } from '../../src/state/AppStateContext';
import { useRoutePlanning } from '../../src/features/routing/hooks/useRoutePlanning';
import { getRoutes } from '../../src/services/api/osrmApi';
import { TEST_ROUTES } from '../../src/test/fixtures/routes';
import { RouteComparisonPanel } from '../../src/features/routing/components/RouteComparisonPanel';
import { render, screen } from '@testing-library/react';

vi.mock('../../src/services/api/osrmApi', () => ({ getRoutes: vi.fn() }));
vi.mock('../../src/config/env', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, env: { ...original.env, enableDemoFallback: false } };
});
afterEach(() => vi.clearAllMocks());

describe('asynchronous routing', () => {
  it('keeps errors explicit when demonstration fallback is disabled', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getRoutes.mockRejectedValueOnce(Object.assign(new Error('Service offline'), { code: 'NETWORK_ERROR' }));
    const { result } = renderHook(() => ({ ...useAppState(), ...useRoutePlanning() }), { wrapper: AppStateProvider });
    act(() => {
      result.current.dispatch({ type: 'SET_PICKUP', payload: { lat: 28.6, lng: 77.2 } });
      result.current.dispatch({ type: 'SET_DESTINATION', payload: { lat: 28.5, lng: 77.3 } });
    });
    await waitFor(() => expect(result.current.state.routing.status).toBe('error'));
    expect(result.current.state.routing.routes).toHaveLength(0);
    expect(result.current.state.routing.error).toBe('Service offline');
    warning.mockRestore();
  });
  it('cancels stale requests and refuses late results after endpoints are cleared', async () => {
    let resolveFirst;
    let firstSignal;
    getRoutes.mockImplementationOnce(({ signal }) => {
      firstSignal = signal;
      return new Promise((resolve) => { resolveFirst = resolve; });
    }).mockResolvedValueOnce([TEST_ROUTES[1]]);
    const { result } = renderHook(() => ({ ...useAppState(), ...useRoutePlanning() }), { wrapper: AppStateProvider });
    act(() => {
      result.current.dispatch({ type: 'SET_PICKUP', payload: { lat: 28.6, lng: 77.2 } });
      result.current.dispatch({ type: 'SET_DESTINATION', payload: { lat: 28.5, lng: 77.3 } });
    });
    expect(result.current.state.routing.status).toBe('loading');
    act(() => result.current.dispatch({ type: 'SET_DESTINATION', payload: { lat: 28.51, lng: 77.31 } }));
    await waitFor(() => expect(result.current.state.routing.routes[0]?.id).toBe('r2'));
    expect(firstSignal.aborted).toBe(true);
    act(() => result.current.dispatch({ type: 'SET_DESTINATION', payload: null }));
    await act(async () => resolveFirst(TEST_ROUTES));
    expect(result.current.state.routing.routes).toHaveLength(0);
  });

  it('requests alternate corridors from a reported blockage to the destination', async () => {
    getRoutes.mockResolvedValueOnce(TEST_ROUTES);
    const { result } = renderHook(() => ({ ...useAppState(), ...useRoutePlanning() }), { wrapper: AppStateProvider });
    const origin = { lat: 28.59, lng: 77.209 };
    const destination = { lat: 28.5672, lng: 77.21 };
    await act(async () => {
      await result.current.requestReroute({ origin, destination, incidentId: 'incident-1' });
    });
    expect(getRoutes).toHaveBeenCalledWith(expect.objectContaining({ origin, destination, alternatives: true, signal: expect.any(AbortSignal) }));
    expect(result.current.state.rerouting).toMatchObject({ status: 'success', origin, incidentId: 'incident-1', source: 'osrm' });
    expect(result.current.state.rerouting.routes.map((route) => route.id)).toEqual(['reroute-incident-1-r1', 'reroute-incident-1-r2']);
  });

  it('renders explicit loading and retryable error states', () => {
    const retry = vi.fn();
    const view = render(<RouteComparisonPanel routing={{ status: 'loading' }} routes={[]} onRetry={retry} />);
    expect(screen.getByRole('status')).toHaveTextContent('Requesting');
    view.rerender(<RouteComparisonPanel routing={{ status: 'error', error: 'Network unavailable' }} routes={[]} onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable');
    screen.getByRole('button', { name: 'Retry request' }).click();
    expect(retry).toHaveBeenCalledOnce();
  });
});
