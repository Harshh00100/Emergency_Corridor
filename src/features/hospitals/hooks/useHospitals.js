import { useCallback, useEffect, useRef } from 'react';
import { useAppState } from '../../../state/AppStateContext';
import { getHospitals } from '../../../services/api/overpassApi';
import { getUserFacingError } from '../../../services/errors/ApiError';
import { DEMO_HOSPITALS } from '../../../constants/hospitals';
import { env } from '../../../config/env';
import { ACTION_TYPES as TYPES } from '../../../state/actionTypes';

export const useHospitals = (mapCenter) => {
  const { state, dispatch } = useAppState();
  const loadNumber = useRef(0);
  const activeController = useRef(null);
  const hasSavedHospitals = useRef(false);
  hasSavedHospitals.current = state.hospitals.status === 'success';

  const loadHospitals = useCallback(async () => {
    const requestId = ++loadNumber.current;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    dispatch({ type: TYPES.HOSPITALS_REQUESTED });
    try {
      if (state.offlineMode || navigator.onLine === false) {
        dispatch({ type: TYPES.HOSPITALS_RECEIVED, payload: { items: DEMO_HOSPITALS, source: 'demo', fallbackReason: 'Offline demonstration mode.' } });
        return;
      }
      const items = await getHospitals({ center: mapCenter, radiusMeters: 10000, signal: controller.signal });
      if (controller.signal.aborted || requestId !== loadNumber.current) return;
      dispatch({ type: TYPES.HOSPITALS_RECEIVED, payload: { items, source: 'openstreetmap' } });
    } catch (error) {
      if (controller.signal.aborted || error.code === 'ABORTED' || requestId !== loadNumber.current) return;
      if (import.meta.env.DEV) console.warn('Hospital request failed', error.code);
      if (env.enableDemoFallback) {
        dispatch({ type: TYPES.HOSPITALS_RECEIVED, payload: { items: DEMO_HOSPITALS, source: 'demo', fallbackReason: getUserFacingError(error) } });
        dispatch({ type: TYPES.ADD_NOTIFICATION, payload: { tone: 'caution', title: 'Demo hospital data active', message: getUserFacingError(error) } });
      } else {
        dispatch({ type: TYPES.HOSPITALS_FAILED, payload: getUserFacingError(error, 'Unable to load hospital data.') });
      }
    }
    if (requestId === loadNumber.current) activeController.current = null;
  }, [dispatch, mapCenter, state.offlineMode]);

  useEffect(() => {
    if (!hasSavedHospitals.current) loadHospitals();
    return () => {
      loadNumber.current += 1;
      activeController.current?.abort();
    };
  }, [loadHospitals, state.workspaceRevision]);

  return { reloadHospitals: loadHospitals, hospitals: state.hospitals };
};
