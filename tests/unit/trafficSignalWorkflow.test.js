import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHospitalsWithinRadius } from '../../src/features/hospitals/utils/hospitalData';
import { transformTrafficSignalElement } from '../../src/features/trafficSignals/utils/signalData';
import { distanceBetweenCoordinates } from '../../src/utils/geography';
import { sendSignalAlert } from '../../src/services/api/signalAlertApi';

afterEach(() => vi.restoreAllMocks());

const pickup = { lat: 28.6139, lng: 77.209 };

describe('traffic signal and pickup-radius workflow', () => {
  it('keeps only hospitals within the two kilometre straight-line radius', () => {
    const hospitals = [
      { id: 'near', name: 'Near', lat: 28.62, lng: 77.209 },
      { id: 'far', name: 'Far', lat: 28.65, lng: 77.209 }
    ];
    const nearby = getHospitalsWithinRadius(hospitals, pickup);
    expect(nearby.map((hospital) => hospital.id)).toEqual(['near']);
    expect(nearby[0].distanceMeters).toBeLessThanOrEqual(2000);
    expect(distanceBetweenCoordinates(pickup, hospitals[1])).toBeGreaterThan(2000);
  });

  it('accepts only correctly shaped mapped traffic signals', () => {
    expect(transformTrafficSignalElement({ type: 'node', id: 7, lat: 28.61, lon: 77.21, tags: { highway: 'traffic_signals', name: 'Signal A' } })).toMatchObject({ id: 'osm-signal-7', name: 'Signal A', source: 'openstreetmap' });
    expect(transformTrafficSignalElement({ type: 'node', id: 8, lat: 28.61, lon: 77.21, tags: { highway: 'crossing' } })).toBeNull();
  });

  it('supports local demo delivery and validates a configured gateway receipt', async () => {
    const request = { requestId: 'request-1', pickup, target: { id: 'osm-signal-7', name: 'Signal A', lat: 28.61, lng: 77.21, source: 'openstreetmap' } };
    await expect(sendSignalAlert({ ...request, target: { ...request.target, source: 'demo' } }, { endpoint: '' })).resolves.toMatchObject({ status: 'demo' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ requestId: 'request-1', signalId: 'osm-signal-7', status: 'accepted', receiptId: 'receipt-1' }) });
    await expect(sendSignalAlert(request, { endpoint: 'https://gateway.example/clearance' })).resolves.toEqual({ status: 'accepted', receiptId: 'receipt-1' });
    expect(globalThis.fetch).toHaveBeenCalledWith('https://gateway.example/clearance', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'Idempotency-Key': 'request-1' }) }));
  });
});
