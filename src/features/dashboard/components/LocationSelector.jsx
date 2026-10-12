import { useState } from 'react';
import { isValidCoordinate } from '../../../utils/coordinates';

const LocationField = ({ label, value, mode, activeMode, onSelect, onClear }) => (
  <div className={`location-field${activeMode === mode ? ' location-field-active' : ''}`}>
    <div className="location-field-label"><span className={`location-dot location-dot-${mode}`} aria-hidden="true" />{label}</div>
    <button type="button" className="location-value" onClick={() => onSelect(mode)}>
      {value ? value.label || `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}` : `Click map to set ${label.toLowerCase()}`}
    </button>
    {value && <button type="button" className="clear-location" onClick={onClear} aria-label={`Clear ${label}`}>Clear</button>}
  </div>
);

export const LocationSelector = ({ pickup, destination, selectionMode, onModeChange, onClearPickup, onClearDestination, onSetEndpoint }) => {
  const [error, setError] = useState('');
  const submitCoordinates = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const point = { lat: Number(form.get('latitude')), lng: Number(form.get('longitude')) };
    if (!isValidCoordinate(point)) { setError('Enter a latitude from -90 to 90 and longitude from -180 to 180.'); return; }
    setError('');
    onSetEndpoint(form.get('endpoint'), { ...point, label: `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}` });
  };
  return (
  <section className="panel control-section">
    <div className="section-heading">
      <div><p className="eyebrow">01 · Dispatch setup</p><h2>Set corridor endpoints</h2></div>
      <span className="section-note">Endpoints are saved with this scenario</span>
    </div>
    <div className="location-list">
      <LocationField label="Pickup" value={pickup} mode="pickup" activeMode={selectionMode} onSelect={onModeChange} onClear={onClearPickup} />
      <LocationField label="Destination" value={destination} mode="destination" activeMode={selectionMode} onSelect={onModeChange} onClear={onClearDestination} />
    </div>
    {onSetEndpoint && <details className="coordinate-entry"><summary>Enter coordinates (keyboard alternative)</summary>
      <form onSubmit={submitCoordinates} className="coordinate-form">
        <label className="field-label">Endpoint<select name="endpoint" className="select-input"><option value="pickup">Pickup</option><option value="destination">Destination</option></select></label>
        <label className="field-label">Latitude<input className="text-input" name="latitude" type="number" step="any" min="-90" max="90" defaultValue="28.6139" required /></label>
        <label className="field-label">Longitude<input className="text-input" name="longitude" type="number" step="any" min="-180" max="180" defaultValue="77.2090" required /></label>
        <button className="button button-secondary" type="submit">Set endpoint</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>}
  </section>
);
};
