import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHospitals } from '../../src/services/api/overpassApi';
import { transformHospitalElement } from '../../src/features/hospitals/utils/hospitalData';

afterEach(() => vi.restoreAllMocks());

describe('hospital data validation', () => {
  it('uses returned tags without inventing clinical fields', () => {
    const hospital = transformHospitalElement({ type: 'way', id: 42, center: { lat: 28.6, lon: 77.2 }, tags: { name: 'Mapped hospital' } });
    expect(hospital).toMatchObject({ name: 'Mapped hospital', source: 'openstreetmap', lat: 28.6 });
    expect(hospital.address).toContain('not provided');
    expect(hospital.tags.emergency).toBeUndefined();
    expect(transformHospitalElement({ type: 'node', id: 1, lat: 200, lon: 20 })).toBeNull();
  });
  it('treats Overpass timeout remarks as errors, even with an elements array', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ elements: [], remark: 'runtime error: timed out' }) });
    await expect(getHospitals({ bounds: [28, 77, 29, 78] })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('accepts a successful empty result without fabricating hospital records', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ elements: [] }) });
    expect(await getHospitals({ bounds: [28, 77, 29, 78] })).toEqual([]);
  });
});
