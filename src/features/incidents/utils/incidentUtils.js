import { INCIDENT_PENALTIES } from '../../../constants/scoring';

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (value) => (value * Math.PI) / 180;

const projectToLocalMeters = (coordinate, origin) => ({
  x: toRadians(coordinate.lng - origin.lng) * EARTH_RADIUS_METERS * Math.cos(toRadians(origin.lat)),
  y: toRadians(coordinate.lat - origin.lat) * EARTH_RADIUS_METERS
});

const pointToSegmentDistance = (point, start, end) => {
  const origin = point;
  const localPoint = projectToLocalMeters(point, origin);
  const localStart = projectToLocalMeters(start, origin);
  const localEnd = projectToLocalMeters(end, origin);
  const vectorX = localEnd.x - localStart.x;
  const vectorY = localEnd.y - localStart.y;
  const lengthSquared = vectorX ** 2 + vectorY ** 2;
  const projection = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((localPoint.x - localStart.x) * vectorX + (localPoint.y - localStart.y) * vectorY) / lengthSquared));
  const closest = {
    x: localStart.x + projection * vectorX,
    y: localStart.y + projection * vectorY
  };
  return Math.sqrt((localPoint.x - closest.x) ** 2 + (localPoint.y - closest.y) ** 2);
};

export const distanceToRouteMeters = (route, incident) => {
  const coordinates = route.geometry?.coordinates || [];
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < coordinates.length; index += 1) {
    const [startLng, startLat] = coordinates[index - 1];
    const [endLng, endLat] = coordinates[index];
    closestDistance = Math.min(
      closestDistance,
      pointToSegmentDistance(
        incident,
        { lat: startLat, lng: startLng },
        { lat: endLat, lng: endLng }
      )
    );
  }
  return closestDistance;
};

export const calculateIncidentPenalty = (route, incidents = []) => {
  const affectedIncidents = incidents
    .map((incident) => {
      const distanceMeters = distanceToRouteMeters(route, incident);
      const radiusMeters = incident.radiusMeters || 400;
      if (distanceMeters > radiusMeters) return null;
      const proximityFactor = Math.max(0.15, 1 - distanceMeters / radiusMeters);
      const basePenalty = INCIDENT_PENALTIES[incident.type]?.[incident.severity] || 0;
      return {
        incident,
        distanceMeters,
        penalty: basePenalty * proximityFactor
      };
    })
    .filter(Boolean);

  const incidentPenalty = Math.min(
    0.9,
    affectedIncidents
      .filter(({ incident }) => incident.type !== 'congestion')
      .reduce((total, item) => total + item.penalty, 0)
  );
  const congestionPenalty = Math.min(
    0.8,
    affectedIncidents
      .filter(({ incident }) => incident.type === 'congestion')
      .reduce((total, item) => total + item.penalty, 0)
  );

  return { incidentPenalty, congestionPenalty, affectedIncidents };
};

export const getIncidentLabel = (incident) => {
  const typeLabels = { blockage: 'Road blockage', accident: 'Accident simulation', congestion: 'Congestion simulation' };
  return `${typeLabels[incident.type] || 'Incident'} · ${incident.severity} severity`;
};
