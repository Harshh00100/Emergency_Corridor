import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../../src/config/env';

describe('environment configuration', () => {
  it('provides safe defaults and warnings for malformed values', () => {
    const { config, warnings } = parseEnvironment({ VITE_DEFAULT_MAP_LAT: '1000', VITE_OSRM_BASE_URL: 'javascript:bad', VITE_REQUEST_TIMEOUT_MS: '-1' });
    expect(config.defaultMap.lat).toBe(28.6139);
    expect(config.requestTimeoutMs).toBe(8000);
    expect(warnings).toHaveLength(3);
  });
  it('can explicitly disable fallbacks', () => {
    expect(parseEnvironment({ VITE_ENABLE_DEMO_FALLBACK: 'false' }).config.enableDemoFallback).toBe(false);
  });
});
