import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { AppStateProvider } from '../../src/state/AppStateContext';
import { TEST_HOSPITAL_RESPONSE, TEST_OSRM_RESPONSE } from '../../src/test/fixtures/routes';

vi.mock('../../src/features/map/components/MapView', () => ({
  MapView: ({ onMapClick, ambulancePosition }) => <div>
    <button type="button" onClick={() => onMapClick({ latlng: { lat: 28.6139, lng: 77.209 } })}>Place fixture pickup</button>
    <output aria-label="Ambulance position">{ambulancePosition ? JSON.stringify(ambulancePosition) : 'Idle'}</output>
  </div>
}));

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('complete dispatch workflow', () => {
  it('loads services, selects endpoints, simulates movement, and reconsiders a blockage', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => ({ ok: true, json: async () => String(url).includes('route/v1') ? TEST_OSRM_RESPONSE : TEST_HOSPITAL_RESPONSE }));
    const user = userEvent.setup();
    render(<AppStateProvider><App /></AppStateProvider>);
    await user.click(screen.getByRole('button', { name: 'Place fixture pickup' }));
    await user.click(await screen.findByRole('button', { name: /Fixture Hospital/ }));
    const first = await screen.findByRole('button', { name: /01 Corridor 1 Recommended/ });
    expect(first).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Start movement' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
    const initialPosition = screen.getByLabelText('Ambulance position').textContent;
    await waitFor(() => expect(screen.getByLabelText('Ambulance position').textContent).not.toBe(initialPosition));
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await user.click(screen.getByRole('button', { name: 'Simulate blockage on recommended corridor' }));
    expect(await screen.findByRole('button', { name: /01 Corridor 2 Recommended/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Switch to recommendation' }));
    const confirmation = screen.getByRole('dialog', { name: 'Switch simulation corridor?' });
    await user.click(within(confirmation).getByRole('button', { name: 'Switch and restart at pickup' }));
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByLabelText('Ambulance position')).toHaveTextContent('Idle');
    expect(screen.getAllByText('Recommendation changed').length).toBeGreaterThan(0);
  });

  it('labels fallback hospitals and routes, and exposes an actionable retry', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    const user = userEvent.setup();
    render(<AppStateProvider><App /></AppStateProvider>);
    await user.click(screen.getByRole('button', { name: 'Place fixture pickup' }));
    await user.click(await screen.findByRole('button', { name: /AIIMS New Delhi/ }));
    expect(await screen.findByText(/Illustrative demo routes, not road-aligned/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry OSRM routes' })).toBeEnabled();
    expect(screen.getByText('Sample data')).toBeInTheDocument();
  });

  it('cleans up the simulation interval on unmount', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => ({ ok: true, json: async () => String(url).includes('route/v1') ? TEST_OSRM_RESPONSE : TEST_HOSPITAL_RESPONSE }));
    const user = userEvent.setup();
    const view = render(<AppStateProvider><App /></AppStateProvider>);
    await user.click(screen.getByRole('button', { name: 'Place fixture pickup' }));
    await user.click(await screen.findByRole('button', { name: /Fixture Hospital/ }));
    await screen.findByRole('button', { name: /01 Corridor 1 Recommended/ });
    vi.useFakeTimers();
    act(() => screen.getByRole('button', { name: 'Start movement' }).click());
    act(() => { vi.advanceTimersByTime(1000); });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
