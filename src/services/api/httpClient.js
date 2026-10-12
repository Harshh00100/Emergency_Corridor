import { env } from '../../config/env';
import { ApiError } from '../errors/ApiError';

const createTimeoutSignal = (timeoutMs, externalSignal) => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort('timeout'), timeoutMs);
  const cancel = () => controller.abort('external');
  externalSignal?.addEventListener('abort', cancel, { once: true });
  if (externalSignal?.aborted) cancel();

  return {
    signal: controller.signal,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', cancel);
    }
  };
};

export const requestJson = async (url, options = {}) => {
  const { timeoutMs = env.requestTimeoutMs, signal, ...requestOptions } = options;
  const timeout = createTimeoutSignal(timeoutMs, signal);
  try {
    if (timeout.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const response = await fetch(url, {
      ...requestOptions,
      signal: timeout.signal,
      headers: {
        Accept: 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new ApiError(`Public service returned HTTP ${response.status}.`, {
        status: response.status,
        code: 'HTTP_ERROR'
      });
    }

    try {
      return await response.json();
    } catch (error) {
      if (timeout.signal.aborted) throw error;
      throw new ApiError('Public service returned malformed JSON.', {
        code: 'INVALID_JSON',
        cause: error
      });
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timeout.signal.aborted) {
      const reason = timeout.signal.reason;
      throw new ApiError(
        reason === 'external' ? 'Request was cancelled.' : 'Request timed out.',
        { code: reason === 'external' ? 'ABORTED' : 'TIMEOUT', cause: error }
      );
    }
    throw new ApiError('Network request failed. Check the connection and try again.', {
      code: 'NETWORK_ERROR',
      cause: error
    });
  } finally {
    timeout.cleanup();
  }
};
