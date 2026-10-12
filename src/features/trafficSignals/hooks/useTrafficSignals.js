import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppState } from '../../../state/AppStateContext';
import { ACTION_TYPES as TYPES } from '../../../state/actionTypes';
import { env } from '../../../config/env';
import { getTrafficSignals } from '../../../services/api/overpassApi';
import { sendSignalAlert } from '../../../services/api/signalAlertApi';
import { getUserFacingError } from '../../../services/errors/ApiError';
import { DEMO_TRAFFIC_SIGNALS } from '../../../constants/trafficSignals';
import { sortByDistanceFrom } from '../../../utils/geography';

export const useTrafficSignals = (pickup) => {
  const { state, dispatch } = useAppState();
  const loadNumber = useRef(0);
  const activeController = useRef(null);
  const clearanceController = useRef(null);
  const clearanceRequest = useRef(null);
  const hasSavedSignals = useRef(false);
  hasSavedSignals.current = state.trafficSignals.status === 'success';

  const loadTrafficSignals = useCallback(async () => {
    if (!pickup) return;
    const requestId = ++loadNumber.current;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    dispatch({ type: TYPES.TRAFFIC_SIGNALS_REQUESTED });
    try {
      if (state.offlineMode || navigator.onLine === false) {
        dispatch({ type: TYPES.TRAFFIC_SIGNALS_RECEIVED, payload: { items: DEMO_TRAFFIC_SIGNALS, source: 'demo', fallbackReason: 'Offline demonstration mode.' } });
        return;
      }
      const items = await getTrafficSignals({ center: pickup, radiusMeters: 2000, signal: controller.signal });
      if (controller.signal.aborted || requestId !== loadNumber.current) return;
      dispatch({ type: TYPES.TRAFFIC_SIGNALS_RECEIVED, payload: { items, source: 'openstreetmap' } });
    } catch (error) {
      if (controller.signal.aborted || error.code === 'ABORTED' || requestId !== loadNumber.current) return;
      if (import.meta.env.DEV) console.warn('Traffic signal request failed', error.code);
      if (env.enableDemoFallback) {
        dispatch({ type: TYPES.TRAFFIC_SIGNALS_RECEIVED, payload: { items: DEMO_TRAFFIC_SIGNALS, source: 'demo', fallbackReason: getUserFacingError(error) } });
      } else {
        dispatch({ type: TYPES.TRAFFIC_SIGNALS_FAILED, payload: getUserFacingError(error, 'Unable to load nearby traffic signals.') });
      }
    }
    if (requestId === loadNumber.current) activeController.current = null;
  }, [dispatch, pickup, state.offlineMode]);

  useEffect(() => {
    if (!hasSavedSignals.current) loadTrafficSignals();
    return () => {
      loadNumber.current += 1;
      activeController.current?.abort();
      clearanceController.current?.abort();
      clearanceController.current = null;
      clearanceRequest.current = null;
    };
  }, [loadTrafficSignals, state.workspaceRevision]);

  const signals = useMemo(() => sortByDistanceFrom(state.trafficSignals.items, pickup).filter((item) => item.distanceMeters <= 2000), [pickup, state.trafficSignals.items]);
  const nearestSignal = signals[0] || null;
  const requestClearance = useCallback(async () => {
    if ((state.offlineMode || navigator.onLine === false) && env.signalAlertUrl) {
      dispatch({ type: TYPES.ADD_NOTIFICATION, payload: { tone: 'caution', title: 'Gateway offline', message: 'Connect to the network and disable offline demo mode to send gateway alerts.' } });
      return;
    }
    if (!nearestSignal || !pickup || state.trafficSignals.status !== 'success' || clearanceController.current ||
      (state.signalClearance.signalId === nearestSignal.id && ['pending', 'demo', 'accepted'].includes(state.signalClearance.status)) ||
      (env.signalAlertUrl && nearestSignal.source !== 'openstreetmap')) return;
    const controller = new AbortController();
    clearanceController.current = controller;
    // Reuse the exact request on retry: a timed-out gateway may have accepted it.
    if (clearanceRequest.current?.target.id !== nearestSignal.id) {
      clearanceRequest.current = {
        requestId: crypto.randomUUID(), requestedAt: new Date().toISOString(),
        pickup: { lat: pickup.lat, lng: pickup.lng },
        target: { id: nearestSignal.id, name: nearestSignal.name, lat: nearestSignal.lat, lng: nearestSignal.lng, source: nearestSignal.source }
      };
    }
    const request = clearanceRequest.current;
    dispatch({ type: TYPES.REQUEST_SIGNAL_CLEARANCE, payload: { signalId: nearestSignal.id, requestId: request.requestId, requestedAt: request.requestedAt } });
    try {
      const result = await sendSignalAlert(request, { signal: controller.signal });
      if (!controller.signal.aborted) dispatch({ type: TYPES.SIGNAL_CLEARANCE_RESOLVED, payload: { requestId: request.requestId, ...result } });
    } catch (error) {
      if (controller.signal.aborted || error.code === 'ABORTED') return;
      const message = error.code === 'INVALID_RECEIPT' ? error.message : 'The gateway did not confirm delivery. Check the connection and retry the same request.';
      dispatch({ type: TYPES.SIGNAL_CLEARANCE_FAILED, payload: { requestId: request.requestId, error: message } });
    } finally {
      if (clearanceController.current === controller) clearanceController.current = null;
    }
  }, [dispatch, nearestSignal, pickup, state.trafficSignals.status, state.signalClearance, state.offlineMode]);

  return {
    trafficSignals: { ...state.trafficSignals, items: signals },
    nearestSignal,
    requestClearance,
    reloadTrafficSignals: loadTrafficSignals
  };
};
