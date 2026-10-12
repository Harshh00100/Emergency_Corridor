import { env } from '../../config/env';
import { isValidCoordinate } from '../../utils/coordinates';
import { ApiError } from '../errors/ApiError';
import { requestJson } from './httpClient';

// The gateway maps OSM ids to its managed controller registry. An accepted
// request confirms gateway receipt, never a physical change to signal phases.
export const sendSignalAlert = async (request, { signal, endpoint = env.signalAlertUrl } = {}) => {
  if (!request?.requestId || !request.target?.id || !isValidCoordinate(request.pickup) || !isValidCoordinate(request.target)) {
    throw new ApiError('A pickup and signal target are required.', { code: 'INVALID_SIGNAL_ALERT' });
  }
  if (signal?.aborted) throw new ApiError('Request cancelled.', { code: 'ABORTED' });
  if (!endpoint) return { status: 'demo', receiptId: null };
  if (request.target.source !== 'openstreetmap') {
    throw new ApiError('Sample signal locations cannot be sent to the configured gateway.', { code: 'SAMPLE_SIGNAL' });
  }
  const receipt = await requestJson(endpoint, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': request.requestId },
    body: JSON.stringify({ ...request, type: 'clearance-request' })
  });
  if (receipt?.requestId !== request.requestId || receipt?.signalId !== request.target.id ||
    receipt?.status !== 'accepted' || typeof receipt?.receiptId !== 'string' || !receipt.receiptId.trim()) {
    throw new ApiError('The gateway did not confirm receipt for this signal. Delivery is unconfirmed.', { code: 'INVALID_RECEIPT' });
  }
  return { status: 'accepted', receiptId: receipt.receiptId };
};
