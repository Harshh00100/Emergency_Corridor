import { MAX_CHECKPOINTS } from './scenarioSerializer';

export const recordCheckpoint = (previous, next, action) => {
  if (next === previous || action.type === 'LOAD_SCENARIO' || action.type === 'NEW_SCENARIO') return next;
  if (previous.routing.routes !== next.routing.routes) {
    next = { ...next, recording: [] };
  }
  if (!next.routing.routes.length) return next.recording.length ? { ...next, recording: [] } : next;
  const changed = previous.simulation !== next.simulation || previous.incidents !== next.incidents ||
    previous.routing.selectedRouteId !== next.routing.selectedRouteId || previous.routing.routes !== next.routing.routes;
  if (!changed) return next;
  const last = next.recording.at(-1);
  const at = Math.max(Date.parse(action.meta?.timestamp) || 0, last?.at || 0);
  if (action.type === 'TICK_SIMULATION' && last && at - last.at < 1000 && next.simulation.status === 'running') return next;
  const frame = { at, simulation: next.simulation, incidents: next.incidents, selectedRouteId: next.routing.selectedRouteId };
  return { ...next, recording: [...next.recording, frame].slice(-MAX_CHECKPOINTS) };
};
