import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../../../state/AppStateContext';
import { ACTION_TYPES as TYPES } from '../../../state/actionTypes';
import { env } from '../../../config/env';
import { LOCATION_MODES } from '../../../constants/map';
import { scoreRoutes, explainRouteDecision } from '../../routing/utils/routeScoring';
import { useRoutePlanning } from '../../routing/hooks/useRoutePlanning';
import { useHospitals } from '../../hospitals/hooks/useHospitals';
import { useAmbulanceSimulation } from '../../simulation/hooks/useAmbulanceSimulation';
import { getPointAlongRoute } from '../../simulation/utils/simulationUtils';
import { useTrafficSignals } from '../../trafficSignals/hooks/useTrafficSignals';
import { getHospitalsWithinRadius } from '../../hospitals/utils/hospitalData';

export const useDashboard = () => {
  const { state, dispatch } = useAppState();
  const [selectionMode, setSelectionMode] = useState(LOCATION_MODES.PICKUP);
  const [hospitalMode, setHospitalMode] = useState('nearby');
  const [pendingIncident, setPendingIncident] = useState(null);
  const [pendingRouteId, setPendingRouteId] = useState(null);
  const previousDecision = useRef(null);
  useEffect(() => {
    setSelectionMode(LOCATION_MODES.PICKUP);
    setPendingIncident(null);
    setPendingRouteId(null);
    setHospitalMode('nearby');
    previousDecision.current = null;
  }, [state.workspaceRevision]);
  const { requestRoutes, requestReroute, clearReroute } = useRoutePlanning();
  const { hospitals, reloadHospitals } = useHospitals(state.locations.pickup || env.defaultMap);
  const trafficSignalData = useTrafficSignals(state.locations.pickup);
  const mapHospitals = useMemo(() => hospitals.status !== 'success' ? [] : hospitalMode === 'nearby' ? getHospitalsWithinRadius(hospitals.items, state.locations.pickup) : hospitals.items, [hospitals, hospitalMode, state.locations.pickup]);
  const scoredRoutes = useMemo(() => scoreRoutes(state.routing.routes, state.incidents), [state.incidents, state.routing.routes]);
  const recommendedRoute = scoredRoutes[0] || null;
  const activeRouteId = state.simulation.routeId || state.routing.selectedRouteId || recommendedRoute?.id;
  const selectedRoute = scoredRoutes.find((route) => route.id === activeRouteId) || recommendedRoute;
  const simulation = useAmbulanceSimulation(selectedRoute);
  const explanation = useMemo(() => explainRouteDecision(recommendedRoute, scoredRoutes, state.incidents), [recommendedRoute, scoredRoutes, state.incidents]);
  const latestBlockage = useMemo(() => [...state.incidents].reverse().find((incident) => incident.type === 'blockage') || null, [state.incidents]);
  const rerouteRoutes = useMemo(() => {
    const rerouteIncidents = state.incidents.filter((incident) => incident.id !== state.rerouting.incidentId);
    return scoreRoutes(state.rerouting.routes, rerouteIncidents);
  }, [state.incidents, state.rerouting.incidentId, state.rerouting.routes]);
  const rerouteRecommendedRoute = rerouteRoutes[0] || null;

  useEffect(() => {
    const previous = previousDecision.current;
    if (previous && previous.incidents !== state.incidents && previous.routes === state.routing.routes && recommendedRoute) {
      const changed = previous.routeId !== recommendedRoute.id;
      const title = changed ? 'Recommendation changed' : 'Recommendation held';
      const message = `${recommendedRoute.label} remains the lowest-cost candidate after reconsideration. ${explanation}`;
      const detail = changed ? `Now recommending ${recommendedRoute.label}. ${explanation}` : message;
      dispatch({ type: TYPES.ADD_NOTIFICATION, payload: { tone: changed ? 'positive' : 'caution', title, message: detail } });
      dispatch({ type: TYPES.ADD_HISTORY_EVENT, payload: { label: title, detail } });
    }
    previousDecision.current = { incidents: state.incidents, routes: state.routing.routes, routeId: recommendedRoute?.id };
  }, [dispatch, explanation, recommendedRoute, state.incidents, state.routing.routes]);

  useEffect(() => {
    if (!latestBlockage || !state.locations.destination) {
      clearReroute();
      return;
    }
    requestReroute({ origin: latestBlockage, destination: state.locations.destination, incidentId: latestBlockage.id });
  }, [clearReroute, latestBlockage, latestBlockage?.id, latestBlockage?.lat, latestBlockage?.lng, requestReroute,
    state.locations.destination,
    state.locations.destination?.lat, state.locations.destination?.lng, state.locations.pickup?.lat, state.locations.pickup?.lng]);

  useEffect(() => {
    if (hospitalMode === 'nearby' && state.locations.pickup && hospitals.status === 'success' && getHospitalsWithinRadius(hospitals.items, state.locations.pickup).length === 0) setHospitalMode('manual');
  }, [hospitalMode, hospitals.items, hospitals.status, state.locations.pickup]);

  const setEndpoint = useCallback((mode, point) => {
    dispatch({ type: mode === LOCATION_MODES.PICKUP ? TYPES.SET_PICKUP : TYPES.SET_DESTINATION, payload: point });
    setPendingIncident(null);
    if (mode === LOCATION_MODES.PICKUP) setHospitalMode('nearby');
    setSelectionMode(mode === LOCATION_MODES.PICKUP ? LOCATION_MODES.DESTINATION : LOCATION_MODES.PICKUP);
  }, [dispatch]);

  const addIncident = useCallback((configuration, point) => {
    dispatch({ type: TYPES.ADD_INCIDENT, payload: { ...configuration, lat: point.lat, lng: point.lng, id: crypto.randomUUID() } });
  }, [dispatch]);

  const handleMapClick = useCallback((event) => {
    const point = { lat: event.latlng.lat, lng: event.latlng.lng, label: `${event.latlng.lat.toFixed(4)}, ${event.latlng.lng.toFixed(4)}` };
    if (selectionMode === LOCATION_MODES.INCIDENT && pendingIncident) {
      addIncident(pendingIncident, point);
      setPendingIncident(null);
      setSelectionMode(LOCATION_MODES.PICKUP);
    } else setEndpoint(selectionMode, point);
  }, [addIncident, pendingIncident, selectionMode, setEndpoint]);

  const selectRoute = useCallback((routeId) => {
    if (state.simulation.status !== 'idle' && state.simulation.routeId !== routeId) setPendingRouteId(routeId);
    else dispatch({ type: TYPES.SELECT_ROUTE, payload: routeId });
  }, [dispatch, state.simulation.routeId, state.simulation.status]);

  return {
    addIncident,
    state, hospitals, scoredRoutes, recommendedRoute, selectedRoute, simulation, explanation,
    rerouteRoutes, rerouteRecommendedRoute,
    trafficSignals: trafficSignalData.trafficSignals, nearestSignal: trafficSignalData.nearestSignal,
    selectionMode, pendingRouteId, hospitalMode, setHospitalMode, mapHospitals,
    switchSuggested: Boolean(state.simulation.status !== 'idle' && selectedRoute?.id !== recommendedRoute?.id && selectedRoute?.affectedIncidents.length),
    onMapClick: handleMapClick,
    setEndpoint,
    setSelectionMode: (mode) => { setPendingIncident(null); setSelectionMode(mode); },
    selectHospital: (hospital) => setEndpoint(LOCATION_MODES.DESTINATION, { lat: hospital.lat, lng: hospital.lng, label: hospital.name, hospitalId: hospital.id }),
    selectRoute,
    requestPlacement: (configuration) => { setPendingIncident(configuration); setSelectionMode(LOCATION_MODES.INCIDENT); },
    blockRecommended: () => {
      if (recommendedRoute) addIncident({ type: 'blockage', severity: 'high', radiusMeters: 250 }, getPointAlongRoute(recommendedRoute, recommendedRoute.distanceMeters / 2));
    },
    removeIncident: (id) => dispatch({ type: TYPES.REMOVE_INCIDENT, payload: id }),
    retryRoutes: () => {
      if (state.locations.pickup && state.locations.destination) requestRoutes(state.locations.pickup, state.locations.destination);
    },
    reloadHospitals,
    requestSignalClearance: trafficSignalData.requestClearance,
    reloadTrafficSignals: trafficSignalData.reloadTrafficSignals,
    start: () => selectedRoute && dispatch({ type: TYPES.START_SIMULATION, payload: { routeId: selectedRoute.id } }),
    pause: () => dispatch({ type: TYPES.PAUSE_SIMULATION }),
    resume: () => dispatch({ type: TYPES.RESUME_SIMULATION }),
    reset: () => dispatch({ type: TYPES.RESET_SIMULATION }),
    setSpeed: (speed) => dispatch({ type: TYPES.SET_SIMULATION_SPEED, payload: speed }),
    confirmSwitch: () => { dispatch({ type: TYPES.SWITCH_SIMULATION_ROUTE, payload: { routeId: pendingRouteId } }); setPendingRouteId(null); },
    cancelSwitch: () => setPendingRouteId(null)
  };
};
