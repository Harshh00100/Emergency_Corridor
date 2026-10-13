import { useState } from 'react';
import { isValidCoordinate } from '../../../utils/coordinates';

export const IncidentControls = ({ onRequestPlacement, onPlaceAtCoordinates, incidents, onRemoveIncident, onBlockRecommended, canBlock }) => {
  const [type, setType] = useState('blockage');
  const [severity, setSeverity] = useState('medium');
  const [radiusMeters, setRadiusMeters] = useState(450);
  const [message, setMessage] = useState('');
  const submitCoordinates = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const point = { lat: Number(form.get('incident-lat')), lng: Number(form.get('incident-lng')) };
    if (!isValidCoordinate(point)) { setMessage('Enter valid latitude and longitude coordinates.'); return; }
    onPlaceAtCoordinates({ type, severity, radiusMeters }, point);
    setMessage(`Simulated ${type} added at ${point.lat}, ${point.lng}.`);
  };
  return (
    <section className="panel control-section">
      <div className="section-heading"><div><p className="eyebrow">04 · Dynamic events</p><h2>Simulate a corridor event</h2></div><span className="section-note">Manual demonstration input</span></div>
      <div className="control-grid control-grid-three">
        <label className="field-label">Event type<select className="select-input" value={type} onChange={(event) => setType(event.target.value)}><option value="blockage">Road blockage</option><option value="accident">Accident simulation</option><option value="congestion">Congestion simulation</option></select></label>
        <label className="field-label">Severity<select className="select-input" value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <label className="field-label">Impact radius<select className="select-input" value={radiusMeters} onChange={(event) => setRadiusMeters(Number(event.target.value))}><option value="250">250 m</option><option value="450">450 m</option><option value="700">700 m</option></select></label>
      </div>
      <button type="button" className="button button-caution button-wide" onClick={() => onRequestPlacement({ type, severity, radiusMeters })}>Click map to place event</button>
      {onPlaceAtCoordinates && <details className="coordinate-entry"><summary>Place event with coordinates</summary>
        <form className="coordinate-form" onSubmit={submitCoordinates}>
          <label className="field-label">Event latitude<input className="text-input" name="incident-lat" type="number" step="any" min="-90" max="90" required /></label>
          <label className="field-label">Event longitude<input className="text-input" name="incident-lng" type="number" step="any" min="-180" max="180" required /></label>
          <button type="submit" className="button button-secondary">Add event at coordinates</button>
          <p role="status">{message}</p>
        </form>
      </details>}
      <button type="button" className="button button-secondary button-wide demo-event-button" disabled={!canBlock} onClick={onBlockRecommended}>Simulate blockage on recommended corridor</button>
      <p className="disclosure-text">The shortcut places a high-severity blockage with a 250 m radius at the route midpoint. Nearby candidates are re-ranked and fresh alternate routes are requested from the reported blockage.</p>
      {incidents.length > 0 && <div className="active-events"><div className="subheading">Active simulated events</div>{incidents.map((incident) => <div className="active-event" key={incident.id}><span><strong>{incident.type}</strong><small>{incident.severity} severity, {incident.radiusMeters} m impact radius</small></span><button type="button" className="text-button" onClick={() => onRemoveIncident(incident.id)}>Remove</button></div>)}</div>}
    </section>
  );
};
