import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { MapView } from '../../map/components/MapView';
import { scoreRoutes } from '../../routing/utils/routeScoring';
import { getPointAlongRoute } from '../../simulation/utils/simulationUtils';

const noop = () => {};
const clock = (milliseconds) => `${Math.floor(milliseconds / 60000)}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')}`;

export const ScenarioReplay = ({ scenario, onClose }) => {
  const { snapshot, recording } = scenario;
  const first = recording[0].at;
  const duration = recording.at(-1).at - first;
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  useEffect(() => {
    if (!playing) return undefined;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - previous, 1000) * speed;
      previous = now;
      setElapsed((value) => Math.min(duration, value + delta));
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, speed, duration]);
  useEffect(() => { if (elapsed >= duration) setPlaying(false); }, [elapsed, duration]);
  const frame = [...recording].reverse().find((item) => item.at <= first + elapsed) || recording[0];
  const frameIndex = recording.indexOf(frame);
  const routes = useMemo(() => scoreRoutes(snapshot.routing.routes, frame.incidents), [snapshot.routing.routes, frame.incidents]);
  const activeId = frame.simulation.routeId || frame.selectedRouteId || routes[0]?.id;
  const route = routes.find((item) => item.id === activeId);
  const position = frame.simulation.status === 'idle' ? null : getPointAlongRoute(route, frame.simulation.progressMeters);
  const history = snapshot.history.filter((event) => Date.parse(event.timestamp) <= first + elapsed);
  return (
    <Modal open title={`Replay: ${scenario.name || 'Untitled scenario'}`} onClose={onClose} wide>
      <p className="disclosure-text">Review recorded movement, events, and recommendation changes. Live movement is paused. The latest 180 checkpoints are retained; loading new routes starts a new recording.</p>
      <div className="replay-map">
        <MapView center={[snapshot.locations.pickup.lat, snapshot.locations.pickup.lng]} zoom={12}
          pickup={snapshot.locations.pickup} destination={snapshot.locations.destination}
          hospitals={snapshot.hospitals.items} trafficSignals={snapshot.trafficSignals.items}
          routes={routes} viewportRoutes={snapshot.routing.routes} recommendedRouteId={routes[0]?.id} selectedRouteId={activeId}
          incidents={frame.incidents} ambulancePosition={position} simulationStatus={frame.simulation.status}
          placementMode="review" onMapClick={noop} onRouteSelect={noop} onHospitalSelect={noop}
          routeSource={snapshot.routing.source} offlineMode={snapshot.offlineMode || navigator.onLine === false} readOnly />
      </div>
      <label className="field-label replay-scrubber">Replay timeline
        <input type="range" min="0" max={Math.max(1, recording.length - 1)} step="1" value={frameIndex} disabled={!duration}
          aria-valuetext={`${Math.round(elapsed / 1000)} seconds of ${Math.round(duration / 1000)} seconds`}
          onChange={(event) => { setPlaying(false); setElapsed(recording[Number(event.target.value)].at - first); }} />
      </label>
      <div className="simulation-actions">
        <button type="button" className="button button-primary" disabled={!duration} onClick={() => { if (elapsed >= duration) setElapsed(0); setPlaying(!playing); }}>{playing ? 'Pause replay' : 'Play replay'}</button>
        <button type="button" className="button button-secondary" onClick={() => { setPlaying(false); setElapsed(0); }}>Rewind replay</button>
        <label className="field-label">Replay speed<select className="select-input" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>{[1, 4, 16].map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
      </div>
      <p className="replay-summary">{clock(elapsed)} / {clock(duration)} · Ambulance {frame.simulation.status} · {frame.incidents.length} event(s)</p>
      <p role="status">Recorded recommendation: <strong>{routes[0]?.label || 'None'}</strong> · Active corridor: {route?.label || 'None'}</p>
      <details><summary>Recorded event history ({history.length})</summary><ol className="replay-history">{[...history].reverse().map((event) => <li key={event.id}><strong>{event.label}</strong> — {event.detail}</li>)}</ol></details>
    </Modal>
  );
};
