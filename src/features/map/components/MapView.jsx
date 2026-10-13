import { useEffect, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL, ROUTE_COLORS } from '../../../constants/map';
import { IncidentMarker } from './IncidentMarker';
import { AmbulanceMarker } from './AmbulanceMarker';
import { MapLegend } from './MapLegend';
import { LoadingState } from '../../../components/common/LoadingState';
import { env } from '../../../config/env';

const makeMarkerIcon = (className, label) => L.divIcon({
  className: 'map-marker-wrapper',
  html: `<span class="map-marker ${className}" aria-label="${label}">${label.slice(0, 1)}</span>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const pickupIcon = makeMarkerIcon('marker-pickup', 'Pickup');
const destinationIcon = makeMarkerIcon('marker-destination', 'Destination');
const hospitalIcon = makeMarkerIcon('marker-hospital', 'Hospital');
const signalIcon = makeMarkerIcon('marker-signal', 'Traffic signal');
const nearestSignalIcon = makeMarkerIcon('marker-signal marker-signal-nearest', 'Nearest traffic signal');
const rerouteIcon = makeMarkerIcon('marker-reroute', 'Reroute origin');

const ClickCapture = ({ onMapClick }) => {
  useMapEvents({ click: onMapClick });
  return null;
};

const RouteViewport = ({ routes, pickup, destination }) => {
  const map = useMap();
  useEffect(() => {
    const points = routes.flatMap((route) => route.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
    if (points.length > 1) map.fitBounds(points, { padding: [36, 36], maxZoom: 14 });
    else if (pickup && destination) map.fitBounds([[pickup.lat, pickup.lng], [destination.lat, destination.lng]], { padding: [48, 48], maxZoom: 14 });
  }, [destination, map, pickup, routes]);
  return null;
};

export const MapView = ({
  center,
  zoom,
  pickup,
  destination,
  hospitals,
  showHospitalRadius = false,
  trafficSignals = [],
  nearestSignalId,
  clearance,
  routes,
  rerouteRoutes = [],
  viewportRoutes,
  recommendedRouteId,
  rerouteRecommendedRouteId,
  rerouteOrigin,
  selectedRouteId,
  incidents,
  ambulancePosition,
  simulationStatus,
  placementMode,
  onMapClick,
  onRouteSelect,
  onHospitalSelect,
  onRequestSignalClearance,
  onCancelPlacement,
  routeSource,
  isLoading,
  readOnly = false,
  offlineMode = false
}) => {
  const [tileFailure, setTileFailure] = useState(false);
  const [tileRetry, setTileRetry] = useState(0);
  const clearanceStatus = clearance && clearance.signalId === nearestSignalId ? clearance.status : 'idle';
  return (
  <section className="map-panel panel" aria-label="Emergency route map">
    <div className="map-panel-header">
      <div>
        <p className="eyebrow">Interactive map workspace</p>
        <h2>Corridor view</h2>
      </div>
      <span className="map-instruction">{readOnly ? 'Recorded scenario · review mode' : placementMode === 'incident' ? 'Click the map to place a simulated incident' : `Click map to set ${placementMode}`}</span>
    </div>
    <div className="map-canvas-wrap">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="map-canvas">
        {!offlineMode && <TileLayer key={tileRetry} attribution={MAP_TILE_ATTRIBUTION} url={MAP_TILE_URL}
          eventHandlers={{ tileerror: () => setTileFailure(true) }} />}
        {!readOnly && <ClickCapture onMapClick={onMapClick} />}
        {showHospitalRadius && pickup && <Circle interactive={false} center={[pickup.lat, pickup.lng]} radius={2000} pathOptions={{ color: 'var(--alternative)', fillColor: 'var(--alternative)', fillOpacity: 0.06, weight: 1, dashArray: '5 5' }} />}
        {routes.map((route) => (
          <Polyline
            key={route.id}
            bubblingMouseEvents={false}
            positions={route.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
            pathOptions={{
              color: route.id === recommendedRouteId ? ROUTE_COLORS.recommended : route.id === selectedRouteId ? ROUTE_COLORS.selected : ROUTE_COLORS.alternative,
              weight: route.id === recommendedRouteId || route.id === selectedRouteId ? 6 : 4,
              opacity: route.id === recommendedRouteId || route.id === selectedRouteId ? 0.95 : 0.68,
              dashArray: route.id === recommendedRouteId ? undefined : '7 6'
            }}
            eventHandlers={readOnly ? {} : { click: (event) => placementMode === 'incident' ? onMapClick(event) : onRouteSelect(route.id) }}
          >
            <Popup><strong>{route.label || `Route ${route.rank}`}</strong><br />{readOnly ? 'Recorded corridor' : 'Click to select this route for simulation.'}</Popup>
          </Polyline>
        ))}
        {rerouteRoutes.map((route) => (
          <Polyline
            key={route.id}
            bubblingMouseEvents={false}
            positions={route.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
            pathOptions={{
              color: ROUTE_COLORS.reroute,
              weight: route.id === rerouteRecommendedRouteId ? 6 : 4,
              opacity: route.id === rerouteRecommendedRouteId ? 0.98 : 0.78,
              dashArray: route.id === rerouteRecommendedRouteId ? '12 6' : '6 8'
            }}
          >
            <Popup><strong>{route.label}</strong><br />Alternate route from the reported blockage.</Popup>
          </Polyline>
        ))}
        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}><Popup><strong>Pickup</strong><br />{pickup.label || 'Selected map location'}</Popup></Marker>}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}><Popup><strong>Destination</strong><br />{destination.label || 'Selected destination'}</Popup></Marker>}
        {rerouteOrigin && <Marker position={[rerouteOrigin.lat, rerouteOrigin.lng]} icon={rerouteIcon}><Popup><strong>Reported blockage</strong><br />Alternate routes start here.</Popup></Marker>}
        {hospitals.map((hospital) => (
          <Marker key={hospital.id} position={[hospital.lat, hospital.lng]} icon={hospitalIcon} title={hospital.name}>
            <Popup><strong>{hospital.name}</strong><br />{hospital.address}<br />{hospital.source === 'demo' ? 'Sample location' : 'OpenStreetMap record'}{!readOnly && <><br /><button type="button" className="button button-secondary" onClick={() => onHospitalSelect(hospital)}>Set hospital destination</button></>}</Popup>
          </Marker>
        ))}
        {trafficSignals.map((signal) => (
          <Marker key={signal.id} position={[signal.lat, signal.lng]} icon={signal.id === nearestSignalId ? nearestSignalIcon : signalIcon} title={signal.name}>
            <Popup><strong>{signal.name}</strong><br />{signal.roadName}<br />{signal.source === 'demo' ? 'Sample signal location' : 'OpenStreetMap record · phase unknown'}{signal.id === nearestSignalId && onRequestSignalClearance && <><br /><button type="button" className="button button-secondary" disabled={['pending', 'accepted', 'demo'].includes(clearanceStatus) || Boolean(env.signalAlertUrl && signal.source === 'demo')} onClick={onRequestSignalClearance}>{clearanceStatus === 'pending' ? 'Sending alert…' : clearanceStatus === 'accepted' ? 'Gateway accepted alert' : clearanceStatus === 'demo' ? 'Demo alert recorded' : env.signalAlertUrl ? 'Send clearance alert' : 'Simulate clearance alert'}</button></>}</Popup>
          </Marker>
        ))}
        {incidents.map((incident) => <IncidentMarker incident={incident} key={incident.id} />)}
        <AmbulanceMarker position={ambulancePosition} status={simulationStatus} />
        <RouteViewport routes={viewportRoutes} pickup={pickup} destination={destination} />
      </MapContainer>
      {isLoading && <div className="map-status"><LoadingState label="Requesting route alternatives" /></div>}
      <div className="map-overlays">
        <div className="map-notices">
        {offlineMode && <div className="map-source-note">Offline demo · routes and markers shown without a basemap</div>}
        {!offlineMode && tileFailure && <div className="tile-error" role="status">Some map tiles could not load. Markers and routes remain available.<button className="button button-secondary" type="button" onClick={() => { setTileFailure(false); setTileRetry((value) => value + 1); }}>Retry map tiles</button></div>}
        {routeSource === 'demo' && <div className="map-source-note">SAMPLE GEOMETRY: illustrative paths, not actual roads</div>}
        </div>
        <MapLegend showHospitalRadius={Boolean(showHospitalRadius && pickup)} />
      </div>
      {placementMode === 'incident' && <div className="map-placement-note">Select a location for the simulated event. <button className="text-button" type="button" onClick={onCancelPlacement}>Cancel placement</button></div>}
    </div>
  </section>
);
};
