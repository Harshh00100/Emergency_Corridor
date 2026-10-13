import { ACTION_TYPES as TYPES } from './actionTypes';
import { isValidCoordinate } from '../utils/coordinates';
import { isValidRoute } from '../features/routing/utils/routeMetrics';
import { DEFAULT_SIMULATION_SPEED, SIMULATION_SPEED_OPTIONS } from '../constants/scoring';
import { sortByDistanceFrom } from '../utils/geography';
import { validateScenario } from '../features/scenarios/utils/scenarioSerializer';
import { recordCheckpoint } from '../features/scenarios/utils/recording';

export const initialState = {
  scenarioName: 'Untitled scenario',
  restored: false,
  workspaceRevision: 0,
  offlineMode: false,
  recording: [],
  locations: { pickup: null, destination: null },
  hospitals: { items: [], status: 'idle', error: null, source: 'none', fallbackReason: null },
  trafficSignals: { items: [], status: 'idle', error: null, source: 'none', fallbackReason: null },
  signalClearance: { status: 'idle', signalId: null, signalName: null, requestId: null, requestedAt: null, receiptId: null, error: null },
  routing: { routes: [], selectedRouteId: null, status: 'idle', error: null, source: 'none', fallbackReason: null },
  rerouting: { routes: [], origin: null, incidentId: null, status: 'idle', error: null, source: 'none', fallbackReason: null },
  incidents: [],
  simulation: { status: 'idle', routeId: null, progressMeters: 0, speedKph: DEFAULT_SIMULATION_SPEED },
  notifications: [],
  history: [],
  sequence: 0
};

const record = (state, label, detail, action) => ({
  ...state,
  sequence: state.sequence + 1,
  history: [{ id: state.sequence + 1, label, detail, timestamp: action.meta?.timestamp || '1970-01-01T00:00:00Z' }, ...state.history].slice(0, 40)
});

const resetSimulation = (state) => ({ ...initialState.simulation, speedKph: state.simulation.speedKph });

const notifyError = (state, message) => ({
  ...state,
  sequence: state.sequence + 1,
  notifications: [{ id: state.sequence + 1, tone: 'caution', title: 'Action unavailable', message }, ...state.notifications].slice(0, 5)
});

const reduceAppState = (state, action) => {
  switch (action.type) {
    case TYPES.LOAD_SCENARIO: {
      try {
        const scenario = validateScenario(action.payload);
        const { snapshot } = scenario;
        return {
          ...initialState,
          ...snapshot,
          scenarioName: scenario.name,
          recording: scenario.recording,
          restored: true,
          offlineMode: snapshot.offlineMode,
          workspaceRevision: state.workspaceRevision + 1,
          sequence: snapshot.history.length,
          simulation: { ...snapshot.simulation, status: snapshot.simulation.status === 'running' ? 'paused' : snapshot.simulation.status }
        };
      } catch (error) { return notifyError(state, error.message); }
    }
    case TYPES.NEW_SCENARIO:
      return { ...initialState, workspaceRevision: state.workspaceRevision + 1, offlineMode: state.offlineMode };
    case TYPES.SET_SCENARIO_NAME:
      return { ...state, scenarioName: String(action.payload).slice(0, 80) };
    case TYPES.SET_OFFLINE_MODE:
      return { ...state, offlineMode: Boolean(action.payload) };
    case TYPES.SET_PICKUP:
    case TYPES.SET_DESTINATION: {
      if (action.payload !== null && !isValidCoordinate(action.payload)) return notifyError(state, 'Select a valid map coordinate.');
      const key = action.type === TYPES.SET_PICKUP ? 'pickup' : 'destination';
      return record({ ...state, locations: { ...state.locations, [key]: action.payload }, hospitals: key === 'pickup' ? { ...initialState.hospitals, status: action.payload ? 'loading' : 'idle' } : state.hospitals, trafficSignals: key === 'pickup' ? { ...initialState.trafficSignals, status: action.payload ? 'loading' : 'idle' } : state.trafficSignals, routing: { ...initialState.routing }, rerouting: { ...initialState.rerouting }, signalClearance: key === 'pickup' ? initialState.signalClearance : state.signalClearance, simulation: resetSimulation(state) }, `${key === 'pickup' ? 'Pickup' : 'Destination'} updated`, action.payload?.label || 'Endpoint cleared', action);
    }
    case TYPES.SELECT_ROUTE:
      if (!state.routing.routes.some((route) => route.id === action.payload)) return state;
      return { ...state, routing: { ...state.routing, selectedRouteId: action.payload } };
    case TYPES.ROUTES_REQUESTED:
      return { ...state, routing: { ...initialState.routing, status: 'loading' }, simulation: resetSimulation(state) };
    case TYPES.ROUTES_RECEIVED: {
      const routes = action.payload.routes.filter(isValidRoute);
      if (!routes.length) return { ...state, routing: { ...initialState.routing, status: 'error', error: 'No valid routes were available. Change endpoints or retry.' } };
      return record({ ...state, routing: { ...initialState.routing, ...action.payload, routes, status: 'success' }, simulation: resetSimulation(state) }, 'Corridors loaded', `${routes.length} candidate route(s), source: ${action.payload.source}`, action);
    }
    case TYPES.ROUTES_FAILED:
      return { ...state, routing: { ...initialState.routing, status: 'error', error: action.payload }, simulation: resetSimulation(state) };
    case TYPES.ROUTES_CLEARED:
      return { ...state, routing: { ...initialState.routing }, simulation: resetSimulation(state) };
    case TYPES.REROUTE_REQUESTED:
      return { ...state, rerouting: { ...initialState.rerouting, ...action.payload, status: 'loading' } };
    case TYPES.REROUTE_RECEIVED: {
      const routes = action.payload.routes.filter(isValidRoute);
      if (!routes.length) return { ...state, rerouting: { ...initialState.rerouting, ...action.payload, status: 'error', error: 'No alternate routes were available from the reported blockage.' } };
      return record({ ...state, rerouting: { ...initialState.rerouting, ...action.payload, routes, status: 'success' } }, 'Blockage alternates loaded', `${routes.length} alternate route(s) from the reported blockage`, action);
    }
    case TYPES.REROUTE_FAILED:
      return { ...state, rerouting: { ...initialState.rerouting, ...action.payload, status: 'error', error: action.payload.error } };
    case TYPES.REROUTE_CLEARED:
      return state.rerouting.status === 'idle' && state.rerouting.routes.length === 0 ? state : { ...state, rerouting: { ...initialState.rerouting } };
    case TYPES.HOSPITALS_REQUESTED:
      return { ...state, hospitals: { ...state.hospitals, status: 'loading', error: null } };
    case TYPES.HOSPITALS_RECEIVED:
      return { ...state, hospitals: { ...initialState.hospitals, ...action.payload, status: 'success' } };
    case TYPES.HOSPITALS_FAILED:
      return { ...state, hospitals: { ...initialState.hospitals, status: 'error', error: action.payload } };
    case TYPES.TRAFFIC_SIGNALS_REQUESTED:
      return { ...state, trafficSignals: { ...initialState.trafficSignals, status: 'loading' } };
    case TYPES.TRAFFIC_SIGNALS_RECEIVED:
      return { ...state, trafficSignals: { ...initialState.trafficSignals, ...action.payload, status: 'success' } };
    case TYPES.TRAFFIC_SIGNALS_FAILED:
      return { ...state, trafficSignals: { ...initialState.trafficSignals, status: 'error', error: action.payload } };
    case TYPES.REQUEST_SIGNAL_CLEARANCE: {
      const signal = sortByDistanceFrom(state.trafficSignals.items, state.locations.pickup)[0];
      if (state.trafficSignals.status !== 'success' || !signal || signal.distanceMeters > 2000 ||
        signal.id !== action.payload?.signalId || !action.payload?.requestId) return state;
      if (['pending', 'accepted', 'demo'].includes(state.signalClearance.status) && state.signalClearance.signalId === signal.id) return state;
      return record({ ...state, signalClearance: { ...initialState.signalClearance, status: 'pending', signalId: signal.id, signalName: signal.name, requestId: action.payload.requestId, requestedAt: action.payload.requestedAt } }, 'Signal clearance requested', `Alert target: ${signal.name}`, action);
    }
    case TYPES.SIGNAL_CLEARANCE_RESOLVED: {
      if (state.signalClearance.status !== 'pending' || state.signalClearance.requestId !== action.payload?.requestId || !['demo', 'accepted'].includes(action.payload.status)) return state;
      const isDemo = action.payload.status === 'demo';
      return record({ ...state, signalClearance: { ...state.signalClearance, status: action.payload.status, receiptId: action.payload.receiptId } }, isDemo ? 'Demo clearance alert recorded' : 'Clearance gateway accepted request', `${state.signalClearance.signalName}. ${isDemo ? 'Local simulation only.' : 'Gateway receipt confirmed; signal phase is unconfirmed.'}`, action);
    }
    case TYPES.SIGNAL_CLEARANCE_FAILED: {
      if (state.signalClearance.status !== 'pending' || state.signalClearance.requestId !== action.payload?.requestId) return state;
      return record({ ...state, signalClearance: { ...state.signalClearance, status: 'error', error: action.payload.error } }, 'Clearance delivery unconfirmed', `${state.signalClearance.signalName}: ${action.payload.error}`, action);
    }
    case TYPES.ADD_INCIDENT: {
      const incident = action.payload;
      if (!isValidCoordinate(incident) || !['blockage', 'accident', 'congestion'].includes(incident.type) ||
        !['low', 'medium', 'high'].includes(incident.severity) || !Number.isFinite(incident.radiusMeters) || incident.radiusMeters <= 0) {
        return notifyError(state, 'A valid event type, severity, radius, and position are required.');
      }
      return record({ ...state, incidents: [...state.incidents, incident] }, `Simulated ${incident.type} added`, `${incident.severity} severity, ${incident.radiusMeters} m impact radius`, action);
    }
    case TYPES.REMOVE_INCIDENT: {
      const incident = state.incidents.find((item) => item.id === action.payload);
      if (!incident) return state;
      return record({ ...state, incidents: state.incidents.filter((item) => item.id !== action.payload) }, `Simulated ${incident.type} removed`, 'Route penalties recalculated', action);
    }
    case TYPES.START_SIMULATION: {
      if (!state.routing.routes.some((route) => route.id === action.payload.routeId) || state.routing.status !== 'success') return notifyError(state, 'Load and select a valid route before starting movement.');
      if (['running', 'paused'].includes(state.simulation.status)) return state;
      return record({ ...state, simulation: { ...resetSimulation(state), status: 'running', routeId: action.payload.routeId } }, 'Simulation started', 'Timer-driven movement at the configured speed', action);
    }
    case TYPES.PAUSE_SIMULATION:
      return state.simulation.status !== 'running' ? state : record({ ...state, simulation: { ...state.simulation, status: 'paused' } }, 'Simulation paused', 'Progress preserved', action);
    case TYPES.RESUME_SIMULATION:
      return state.simulation.status !== 'paused' ? state : record({ ...state, simulation: { ...state.simulation, status: 'running' } }, 'Simulation resumed', 'Movement continued from the paused position', action);
    case TYPES.RESET_SIMULATION:
      return record({ ...state, simulation: resetSimulation(state) }, 'Simulation reset', 'Movement returned to the pickup', action);
    case TYPES.TICK_SIMULATION: {
      if (state.simulation.status !== 'running') return state;
      const route = state.routing.routes.find((item) => item.id === state.simulation.routeId);
      const increment = action.payload.distanceIncrementMeters;
      if (!route || !Number.isFinite(increment) || increment < 0) return notifyError({ ...state, simulation: resetSimulation(state) }, 'Movement reset after an invalid simulation state.');
      const progressMeters = Math.min(route.distanceMeters, state.simulation.progressMeters + increment);
      const completed = progressMeters >= route.distanceMeters;
      const next = { ...state, simulation: { ...state.simulation, progressMeters, status: completed ? 'completed' : 'running' } };
      return completed ? record(next, 'Simulation completed', 'The simulated ambulance reached the route endpoint', action) : next;
    }
    case TYPES.SET_SIMULATION_SPEED:
      return SIMULATION_SPEED_OPTIONS.includes(action.payload) ? { ...state, simulation: { ...state.simulation, speedKph: action.payload } } : state;
    case TYPES.SWITCH_SIMULATION_ROUTE:
      if (!state.routing.routes.some((route) => route.id === action.payload.routeId)) return state;
      return record({ ...state,
        routing: { ...state.routing, selectedRouteId: action.payload.routeId },
        simulation: { ...resetSimulation(state), routeId: action.payload.routeId, status: 'paused' }
      }, 'Simulation route switched', 'Restarted at pickup on the new route. Resume to move.', action);
    case TYPES.ADD_NOTIFICATION:
      return { ...state, sequence: state.sequence + 1, notifications: [{ ...action.payload, id: state.sequence + 1 }, ...state.notifications].slice(0, 5) };
    case TYPES.DISMISS_NOTIFICATION:
      return { ...state, notifications: state.notifications.filter((notification) => notification.id !== action.payload) };
    case TYPES.ADD_HISTORY_EVENT:
      return record(state, action.payload.label, action.payload.detail, action);
    default:
      return state;
  }
};

export const appReducer = (state, action) => recordCheckpoint(state, reduceAppState(state, action), action);
