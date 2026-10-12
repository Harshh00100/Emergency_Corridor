import { ROUTE_SCORING_WEIGHTS } from '../../../constants/scoring';
import { calculateIncidentPenalty } from '../../incidents/utils/incidentUtils';
import { isValidRoute, normalizeMetric } from './routeMetrics';

const stableCongestion = (route, index) => {
  if (Number.isFinite(route.simulatedCongestion)) return route.simulatedCongestion;
  return 0.16 + ((index * 0.13) % 0.34);
};

export const scoreRoutes = (routes, incidents = [], weights = ROUTE_SCORING_WEIGHTS) => {
  if (!Array.isArray(routes) || routes.length === 0) return [];
  const scoringWeights = { ...ROUTE_SCORING_WEIGHTS, ...weights };
  const weightSum = Object.values(scoringWeights).reduce((sum, weight) => sum + weight, 0);
  if (Object.values(scoringWeights).some((weight) => !Number.isFinite(weight) || weight < 0) || weightSum <= 0) {
    throw new Error('Scoring weights must be non-negative with a positive total.');
  }

  const enrichedRoutes = routes.filter(isValidRoute).map((route, index) => {
    const incidentEffect = calculateIncidentPenalty(route, incidents);
    const congestion = Math.min(0.95, stableCongestion(route, index) + incidentEffect.congestionPenalty);
    const incidentPenalty = incidentEffect.incidentPenalty;
    const adjustedDurationSeconds = route.durationSeconds * (1 + congestion * 0.75 + incidentPenalty);
    return {
      ...route,
      index,
      congestion,
      incidentPenalty,
      adjustedDurationSeconds,
      affectedIncidents: incidentEffect.affectedIncidents
    };
  });

  const durations = enrichedRoutes.map((route) => route.adjustedDurationSeconds);
  const distances = enrichedRoutes.map((route) => route.distanceMeters);
  const congestionValues = enrichedRoutes.map((route) => route.congestion);
  const incidentValues = enrichedRoutes.map((route) => route.incidentPenalty);

  return enrichedRoutes
    .map((route) => {
      const normalized = {
        travelTime: normalizeMetric(route.adjustedDurationSeconds, durations),
        distance: normalizeMetric(route.distanceMeters, distances),
        congestion: normalizeMetric(route.congestion, congestionValues),
        incidents: normalizeMetric(route.incidentPenalty, incidentValues)
      };
      const score = (
        normalized.travelTime * scoringWeights.travelTime +
        normalized.distance * scoringWeights.distance +
        normalized.congestion * scoringWeights.congestion +
        normalized.incidents * scoringWeights.incidents
      ) / weightSum;
      return { ...route, normalized, score };
    })
    .sort((first, second) => first.score - second.score)
    .map((route, rank) => ({ ...route, rank: rank + 1 }));
};

export const explainRouteDecision = (route, allRoutes, incidents = []) => {
  if (!route) return 'Select a pickup and destination to compare routes.';
  if (allRoutes.length === 1 && incidents.length === 0) {
    return 'Only one route was returned. The recommendation is based on its available travel estimate.';
  }
  const reasons = [];
  const fastest = [...allRoutes].sort((first, second) => first.adjustedDurationSeconds - second.adjustedDurationSeconds)[0];
  const shortest = [...allRoutes].sort((first, second) => first.distanceMeters - second.distanceMeters)[0];
  if (route.id === fastest.id) reasons.push('lowest adjusted travel time');
  if (route.id === shortest.id) reasons.push('shortest route distance');
  if (route.affectedIncidents.length === 0) reasons.push('no nearby simulated incidents');
  else reasons.push(`${route.affectedIncidents.length} nearby simulated incident${route.affectedIncidents.length > 1 ? 's' : ''}`);
  return `Ranked first using normalized travel time, distance, simulated congestion, and incident impact: ${reasons.join(', ')}.`;
};
