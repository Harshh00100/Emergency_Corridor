import { useEffect, useMemo } from 'react';
import { useAppState } from '../../../state/AppStateContext';
import { getPointAlongRoute, getSimulationProgress } from '../utils/simulationUtils';
import { measureGeometry } from '../../../utils/geometry';
import { ACTION_TYPES as TYPES } from '../../../state/actionTypes';

export const useAmbulanceSimulation = (selectedRoute) => {
  const { state, dispatch } = useAppState();
  const { simulation } = state;
  const measurement = useMemo(() => measureGeometry(selectedRoute?.geometry), [selectedRoute?.geometry]);

  useEffect(() => {
    if (simulation.status !== 'running' || !selectedRoute) return undefined;
    let previousTick = performance.now();
    const timerId = window.setInterval(() => {
      const now = performance.now();
      // Cap background-tab catch-up so a hidden demo never jumps to arrival.
      const elapsedSeconds = Math.min(1, (now - previousTick) / 1000);
      previousTick = now;
      dispatch({
        type: TYPES.TICK_SIMULATION,
        payload: {
          distanceIncrementMeters: simulation.speedKph / 3.6 * elapsedSeconds
        }
      });
    }, 250);
    return () => window.clearInterval(timerId);
  }, [dispatch, selectedRoute, simulation.speedKph, simulation.status]);

  return {
    ...getSimulationProgress(selectedRoute, simulation.progressMeters, simulation.speedKph),
    position: simulation.status === 'idle' ? null : getPointAlongRoute(selectedRoute, simulation.progressMeters, measurement),
    status: simulation.status
  };
};
