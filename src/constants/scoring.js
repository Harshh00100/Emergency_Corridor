export const ROUTE_SCORING_WEIGHTS = Object.freeze({
  travelTime: 0.45,
  distance: 0.2,
  congestion: 0.2,
  incidents: 0.15
});

export const INCIDENT_PENALTIES = Object.freeze({
  congestion: { low: 0.04, medium: 0.09, high: 0.16 },
  blockage: { low: 0.18, medium: 0.35, high: 0.65 },
  accident: { low: 0.14, medium: 0.3, high: 0.55 }
});

export const SIMULATION_SPEED_OPTIONS = [35, 45, 55, 65, 80];
export const DEFAULT_SIMULATION_SPEED = 55;
