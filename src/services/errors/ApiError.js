export class ApiError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR', cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.cause = cause;
  }
}

export const getUserFacingError = (error, fallback = 'The request could not be completed.') => {
  if (error?.code === 'TIMEOUT') return 'The public service took too long to respond. Try again or continue in demo mode.';
  if (error?.code === 'ABORTED') return 'The previous request was cancelled because the selection changed.';
  if (error?.code === 'INVALID_RESPONSE') return 'The public service returned incomplete data.';
  if (error?.status === 429) return 'The public service is rate limited. Wait briefly and try again.';
  if (error?.status >= 500) return 'The public service is temporarily unavailable.';
  return error?.message || fallback;
};
