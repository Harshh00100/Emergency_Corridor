import { useCallback, useEffect, useRef } from 'react';
import { useAppState } from '../../../state/AppStateContext';
import { env } from '../../../config/env';
import { getRoutes } from '../../../services/api/osrmApi';
import { buildDemoRoutes } from '../utils/demoRoutes';
import { getUserFacingError } from '../../../services/errors/ApiError';
import { ACTION_TYPES as TYPES } from '../../../state/actionTypes';
import { isValidCoordinate } from '../../../utils/coordinates';
import { haversineDistanceMeters } from '../../../utils/geometry';
import { ApiError } from '../../../services/errors/ApiError';

export const useRoutePlanning = () => {
  const { state, dispatch } = useAppState();
  const requestNumber = useRef(0);
  const activeController = useRef(null);
  const hasSavedRoutes = useRef(false);
  hasSavedRoutes.current = state.routing.status === 'success';

  const requestRoutes = useCallback(async (origin, destination) => {
    const currentRequest = ++requestNumber.current;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    dispatch({ type: TYPES.ROUTES_REQUESTED });
    try {
      if (!isValidCoordinate(origin) || !isValidCoordinate(destination) || haversineDistanceMeters(origin, destination) < 30) {
        throw new ApiError('Select valid endpoints at least 30 metres apart.', { code: 'INVALID_COORDINATES' });
      }
      if (state.offlineMode || navigator.onLine === false) {
        dispatch({ type: TYPES.ROUTES_RECEIVED, payload: { routes: buildDemoRoutes(origin, destination), source: 'demo', fallbackReason: 'Offline demonstration mode.' } });
        return;
      }
      const routes = await getRoutes({ origin, destination, alternatives: true, signal: controller.signal });
      if (controller.signal.aborted || currentRequest !== requestNumber.current) return;
      dispatch({ type: TYPES.ROUTES_RECEIVED, payload: { routes, source: 'osrm' } });
    } catch (error) {
      if (controller.signal.aborted || error.code === 'ABORTED' || currentRequest !== requestNumber.current) return;
      if (import.meta.env.DEV) console.warn('Route request failed', error.code);
      if (env.enableDemoFallback && error.code !== 'INVALID_COORDINATES') {
        dispatch({
          type: TYPES.ROUTES_RECEIVED,
          payload: { routes: buildDemoRoutes(origin, destination), source: 'demo', fallbackReason: getUserFacingError(error) }
        });
      } else {
        dispatch({ type: TYPES.ROUTES_FAILED, payload: getUserFacingError(error, 'Unable to load route alternatives.') });
      }
    }
    if (currentRequest === requestNumber.current) activeController.current = null;
  }, [dispatch, state.offlineMode]);

  useEffect(() => {
    const cancel = () => { requestNumber.current += 1; activeController.current?.abort(); };
    if (!state.locations.pickup || !state.locations.destination) {
      dispatch({ type: TYPES.ROUTES_CLEARED });
      return cancel;
    }
    if (!hasSavedRoutes.current) requestRoutes(state.locations.pickup, state.locations.destination);
    return cancel;
  }, [dispatch, requestRoutes, state.locations.destination, state.locations.pickup, state.workspaceRevision]);

  return { requestRoutes, isRouting: state.routing.status === 'loading' };
};
