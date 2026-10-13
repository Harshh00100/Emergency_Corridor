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
  const rerouteRequestNumber = useRef(0);
  const activeRerouteController = useRef(null);
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

  const requestReroute = useCallback(async ({ origin, destination, incidentId }) => {
    const currentRequest = ++rerouteRequestNumber.current;
    activeRerouteController.current?.abort();
    const controller = new AbortController();
    activeRerouteController.current = controller;
    dispatch({ type: TYPES.REROUTE_REQUESTED, payload: { origin, incidentId } });
    const decorateRoutes = (routes) => routes.map((route, index) => ({
      ...route,
      id: `reroute-${incidentId}-${route.id}`,
      label: `Alternate ${index + 1} · ${route.label}`,
      rerouteIncidentId: incidentId
    }));
    try {
      if (!isValidCoordinate(origin) || !isValidCoordinate(destination) || haversineDistanceMeters(origin, destination) < 30) {
        throw new ApiError('The reported blockage must be at least 30 metres from the destination.', { code: 'INVALID_COORDINATES' });
      }
      if (state.offlineMode || navigator.onLine === false) {
        dispatch({ type: TYPES.REROUTE_RECEIVED, payload: { routes: decorateRoutes(buildDemoRoutes(origin, destination)), source: 'demo', origin, incidentId, fallbackReason: 'Offline demonstration mode.' } });
        return;
      }
      const routes = await getRoutes({ origin, destination, alternatives: true, signal: controller.signal });
      if (controller.signal.aborted || currentRequest !== rerouteRequestNumber.current) return;
      dispatch({ type: TYPES.REROUTE_RECEIVED, payload: { routes: decorateRoutes(routes), source: 'osrm', origin, incidentId } });
    } catch (error) {
      if (controller.signal.aborted || error.code === 'ABORTED' || currentRequest !== rerouteRequestNumber.current) return;
      if (import.meta.env.DEV) console.warn('Reroute request failed', error.code);
      if (env.enableDemoFallback && error.code !== 'INVALID_COORDINATES') {
        dispatch({
          type: TYPES.REROUTE_RECEIVED,
          payload: { routes: decorateRoutes(buildDemoRoutes(origin, destination)), source: 'demo', origin, incidentId, fallbackReason: getUserFacingError(error) }
        });
      } else {
        dispatch({ type: TYPES.REROUTE_FAILED, payload: { origin, incidentId, error: getUserFacingError(error, 'Unable to load alternate routes from the blockage.') } });
      }
    } finally {
      if (currentRequest === rerouteRequestNumber.current) activeRerouteController.current = null;
    }
  }, [dispatch, state.offlineMode]);

  const clearReroute = useCallback(() => {
    rerouteRequestNumber.current += 1;
    activeRerouteController.current?.abort();
    activeRerouteController.current = null;
    dispatch({ type: TYPES.REROUTE_CLEARED });
  }, [dispatch]);

  useEffect(() => {
    const cancel = () => { requestNumber.current += 1; activeController.current?.abort(); };
    if (!state.locations.pickup || !state.locations.destination) {
      dispatch({ type: TYPES.ROUTES_CLEARED });
      return cancel;
    }
    if (!hasSavedRoutes.current) requestRoutes(state.locations.pickup, state.locations.destination);
    return cancel;
  }, [dispatch, requestRoutes, state.locations.destination, state.locations.pickup, state.workspaceRevision]);

  useEffect(() => () => {
    requestNumber.current += 1;
    activeController.current?.abort();
    rerouteRequestNumber.current += 1;
    activeRerouteController.current?.abort();
  }, []);

  return { requestRoutes, requestReroute, clearReroute, isRouting: state.routing.status === 'loading' };
};
