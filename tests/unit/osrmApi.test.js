import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRoutes } from '../../src/services/api/osrmApi';

const origin = { lat: 28.6, lng: 77.2 };
const destination = { lat: 28.61, lng: 77.22 };

describe('OSRM service', () => {
  afterEach(() => vi.restoreAllMocks());

  it('transforms a valid OSRM response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'Ok', routes: [{ distance: 1200, duration: 300, geometry: { type: 'LineString', coordinates: [[77.2, 28.6], [77.22, 28.61]] } }] })
    });
    const result = await getRoutes({ origin, destination });
    expect(result[0]).toMatchObject({ distanceMeters: 1200, durationSeconds: 300, source: 'osrm' });
  });

  it('rejects malformed route data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ code: 'Ok', routes: [] }) });
    await expect(getRoutes({ origin, destination })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('rejects non-finite coordinates inside returned geometry', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ code: 'Ok', routes: [{ distance: 12, duration: 5, geometry: { type: 'LineString', coordinates: [[null, 28.6], [77.2, 28.7]] } }] }) });
    await expect(getRoutes({ origin, destination })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('rejects coincident endpoints rather than fabricating a fallback route', async () => {
    await expect(getRoutes({ origin, destination: origin })).rejects.toMatchObject({ code: 'INVALID_COORDINATES' });
  });

  it('rejects invalid coordinates before making a request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(getRoutes({ origin: { lat: 200, lng: 77 }, destination })).rejects.toMatchObject({ code: 'INVALID_COORDINATES' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
