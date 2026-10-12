import { CircleMarker, Popup } from 'react-leaflet';

export const AmbulanceMarker = ({ position, status }) => {
  if (!position) return null;
  return (
    <CircleMarker
      center={[position.lat, position.lng]}
      radius={9}
      pathOptions={{ color: 'var(--background)', fillColor: 'var(--emergency)', fillOpacity: 1, weight: 3 }}
    >
      <Popup>Ambulance simulation, status: {status}.</Popup>
    </CircleMarker>
  );
};
