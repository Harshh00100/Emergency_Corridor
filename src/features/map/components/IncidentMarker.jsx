import { Circle, CircleMarker, Popup } from 'react-leaflet';
import { getIncidentLabel } from '../../incidents/utils/incidentUtils';

export const IncidentMarker = ({ incident }) => (
  <>
    <Circle
      center={[incident.lat, incident.lng]}
      radius={incident.radiusMeters || 400}
      pathOptions={{ color: 'var(--caution)', fillColor: 'var(--caution)', fillOpacity: 0.08, weight: 1 }}
    />
    <CircleMarker
      center={[incident.lat, incident.lng]}
      radius={7}
      pathOptions={{ color: 'var(--text)', fillColor: 'var(--caution)', fillOpacity: 1, weight: 2 }}
    >
      <Popup>
        <strong>{getIncidentLabel(incident)}</strong>
        <br />Simulated event, not live detection.
      </Popup>
    </CircleMarker>
  </>
);
