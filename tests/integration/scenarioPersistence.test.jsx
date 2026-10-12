import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStateProvider, useAppState } from '../../src/state/AppStateContext';
import { AUTOSAVE_KEY } from '../../src/features/scenarios/services/scenarioStorage';

const Probe = () => {
  const { state, dispatch, persistence } = useAppState();
  return <>
    <button onClick={() => dispatch({ type: 'SET_PICKUP', payload: { lat: 28.6, lng: 77.2 } })}>Set pickup</button>
    <output>{state.locations.pickup ? 'Pickup restored' : 'No pickup'}</output>
    <p>{persistence.error}</p>
    {state.notifications.map((item) => <p key={item.id}>{item.message}</p>)}
  </>;
};

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('browser persistence lifecycle', () => {
  it('flushes the latest state on pagehide and hydrates it on the next mount', () => {
    const view = render(<AppStateProvider><Probe /></AppStateProvider>);
    act(() => screen.getByRole('button', { name: 'Set pickup' }).click());
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(JSON.parse(localStorage.getItem(AUTOSAVE_KEY)).snapshot.locations.pickup.lat).toBe(28.6);
    view.unmount();
    render(<AppStateProvider><Probe /></AppStateProvider>);
    expect(screen.getByText('Pickup restored')).toBeInTheDocument();
  });

  it('recovers from corrupt storage and reports failed writes without crashing', () => {
    localStorage.setItem(AUTOSAVE_KEY, '{bad');
    vi.useFakeTimers();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    render(<AppStateProvider><Probe /></AppStateProvider>);
    expect(screen.getByText(/Could not restore/)).toBeInTheDocument();
    expect(screen.getByText('No pickup')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1600));
    expect(screen.getByText(/Storage may be full or unavailable/)).toBeInTheDocument();
  });
});
