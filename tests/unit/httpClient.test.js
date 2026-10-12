import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestJson } from '../../src/services/api/httpClient';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('HTTP error and cancellation contract', () => {
  it('rejects HTTP errors and malformed JSON consistently', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(requestJson('https://example.test')).rejects.toMatchObject({ status: 429, code: 'HTTP_ERROR' });
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.reject(new SyntaxError()) });
    await expect(requestJson('https://example.test')).rejects.toMatchObject({ code: 'INVALID_JSON' });
  });
  it('reports network failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    await expect(requestJson('https://example.test')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
  it('times out pending requests and removes the timer', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation((_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
    const assertion = expect(requestJson('https://example.test', { timeoutMs: 50 })).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('honors an already aborted caller signal without starting fetch', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(requestJson('https://example.test', { signal: controller.signal })).rejects.toMatchObject({ code: 'ABORTED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
