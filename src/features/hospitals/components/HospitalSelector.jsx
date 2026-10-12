import { useMemo, useState } from 'react';
import { filterHospitals, getHospitalsWithinRadius } from '../utils/hospitalData';
import { EmptyState } from '../../../components/common/EmptyState';
import { LoadingState } from '../../../components/common/LoadingState';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDistance } from '../../../utils/formatters';
import { sortByDistanceFrom } from '../../../utils/geography';
import { isValidCoordinate } from '../../../utils/coordinates';

export const HospitalSelector = ({ hospitals, pickup, selectionMode = 'manual', onModeChange, selectedHospitalId, selectedDestination, onSelect, onRetry }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [manualError, setManualError] = useState('');
  const nearbyHospitals = useMemo(() => getHospitalsWithinRadius(hospitals.items, pickup, 2000), [hospitals.items, pickup]);
  const manualHospitals = useMemo(() => filterHospitals(pickup ? sortByDistanceFrom(hospitals.items, pickup) : hospitals.items, searchTerm), [hospitals.items, pickup, searchTerm]);
  const visibleHospitals = selectionMode === 'nearby' ? nearbyHospitals : manualHospitals;
  const ready = hospitals.status === 'success';
  const submitManualHospital = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('hospitalName') || '').trim();
    const lat = String(form.get('hospitalLatitude') || '').trim();
    const lng = String(form.get('hospitalLongitude') || '').trim();
    const point = { lat: Number(lat), lng: Number(lng) };
    if (!name || !lat || !lng || !isValidCoordinate(point)) {
      setManualError('Enter a hospital name and valid latitude (−90 to 90) and longitude (−180 to 180).');
      return;
    }
    setManualError('');
    onSelect({ ...point, id: `manual-${point.lat}-${point.lng}`, name, source: 'manual' });
  };
  return (
    <section className="panel control-section" aria-labelledby="hospital-panel-title">
      <div className="section-heading">
        <div><p className="eyebrow">02 · Receiving facility</p><h2 id="hospital-panel-title">Hospital destination</h2></div>
        <StatusBadge tone={hospitals.source === 'demo' ? 'caution' : 'neutral'}>{hospitals.source === 'demo' ? 'Sample data' : hospitals.source === 'openstreetmap' ? 'OpenStreetMap' : 'Not loaded'}</StatusBadge>
      </div>
      <div className="hospital-mode-switch" role="group" aria-label="Hospital selection mode">
        <button type="button" className={`mode-button${selectionMode === 'nearby' ? ' mode-button-active' : ''}`} aria-pressed={selectionMode === 'nearby'} onClick={() => onModeChange?.('nearby')}>Within 2 km{pickup && ready ? ` (${nearbyHospitals.length})` : ''}</button>
        <button type="button" className={`mode-button${selectionMode === 'manual' ? ' mode-button-active' : ''}`} aria-pressed={selectionMode === 'manual'} onClick={() => onModeChange?.('manual')}>Select manually</button>
      </div>
      {selectionMode === 'manual' && <><label className="field-label" htmlFor="hospital-search">Search loaded hospitals</label><input id="hospital-search" className="text-input" type="search" placeholder="Search by name or area" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /><p className="disclosure-text">Mapped results cover 10 km around {pickup ? 'pickup' : 'the default map center'}. Enter a facility below for other locations.</p></>}
      {hospitals.status === 'loading' && <LoadingState label="Loading hospital points" />}
      {hospitals.status === 'error' && <div className="inline-error"><span>{hospitals.error}</span><button type="button" className="button button-secondary" onClick={onRetry}>Retry</button></div>}
      {selectionMode === 'nearby' && !pickup && <EmptyState title="Choose a pickup for nearby hospitals" message="Select a pickup on the map or switch to manual selection." />}
      {selectionMode === 'nearby' && pickup && ready && nearbyHospitals.length === 0 && <EmptyState title="No mapped hospital within 2 km" message="Switch to Select manually to choose a more distant facility or enter its coordinates." />}
      {selectionMode === 'manual' && ready && visibleHospitals.length === 0 && <EmptyState title="No mapped hospitals found" message="Try another search or enter the hospital details below." />}
      {ready && visibleHospitals.length > 0 && (
        <div className="hospital-list" aria-label="Hospitals">
          {visibleHospitals.map((hospital) => (
            <button type="button" aria-pressed={hospital.id === selectedHospitalId} className={`hospital-option${hospital.id === selectedHospitalId ? ' hospital-option-selected' : ''}`} key={hospital.id} onClick={() => onSelect(hospital)}>
              <span><strong>{hospital.name}</strong><small>{hospital.address}</small>{Number.isFinite(hospital.distanceMeters) && <small className="hospital-distance">{formatDistance(hospital.distanceMeters)} from pickup</small>}</span>
              <span className="hospital-select-state">{hospital.id === selectedHospitalId ? 'Selected' : 'Use'}</span>
            </button>
          ))}
        </div>
      )}
      {selectedDestination && <p className="selection-note">Destination: <strong>{selectedDestination.label || 'Selected map location'}</strong>. {selectedHospitalId && !visibleHospitals.some((hospital) => hospital.id === selectedHospitalId) ? 'Kept even when outside the current filter.' : ''}</p>}
      {selectionMode === 'manual' && <details className="coordinate-entry"><summary>Enter hospital details manually</summary>
        <form className="coordinate-form" onSubmit={submitManualHospital}>
          <label className="field-label">Hospital name<input className="text-input" name="hospitalName" maxLength={160} required /></label>
          <label className="field-label">Hospital latitude<input className="text-input" name="hospitalLatitude" type="number" step="any" min="-90" max="90" required /></label>
          <label className="field-label">Hospital longitude<input className="text-input" name="hospitalLongitude" type="number" step="any" min="-180" max="180" required /></label>
          <button type="submit" className="button button-secondary">Use manual hospital</button>
          {manualError && <p className="inline-error" role="alert">{manualError}</p>}
        </form>
      </details>}
      {hospitals.fallbackReason && <p className="fallback-note">Sample locations active: {hospitals.fallbackReason}</p>}
      <button type="button" className="button button-secondary refresh-hospitals" onClick={onRetry} disabled={hospitals.status === 'loading'}>Refresh hospital data</button>
      <p className="disclosure-text">The 2 km radius uses straight-line distance, not driving distance. {hospitals.source === 'demo' ? 'Sample names and coordinates are approximate.' : 'OpenStreetMap records may be incomplete.'} Capacity and emergency department availability are not available.</p>
    </section>
  );
};
