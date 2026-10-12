import { ProgressIndicator } from '../../../components/common/ProgressIndicator';
import { SIMULATION_SPEED_OPTIONS } from '../../../constants/scoring';
import { formatDistance, formatDuration } from '../../../utils/formatters';

export const SimulationControls = ({ simulation, progress, remainingDistanceMeters, remainingTimeSeconds, selectedRoute, recommendedRoute, onStart, onPause, onResume, onReset, onSwitchRoute, onSpeedChange, switchSuggested }) => (
  <section className="panel control-section simulation-panel">
    <div className="section-heading"><div><p className="eyebrow">05 · Ambulance movement</p><h2>Demonstration simulation</h2></div><span className="sim-status" role="status" aria-live="polite">{simulation.status}</span></div>
    <div className="simulation-route-row"><span>Selected corridor</span><strong>{selectedRoute?.label || 'No route selected'}</strong></div>
    <ProgressIndicator value={progress} label="Route progress" />
    <p className="disclosure-text">Ambulance {simulation.status} · {Math.round(progress * 100)}% of corridor completed.</p>
    <div className="simulation-metrics"><div><strong>{formatDistance(remainingDistanceMeters)}</strong><span>remaining distance</span></div><div><strong>{formatDuration(remainingTimeSeconds)}</strong><span>estimated remaining</span></div><div><strong>{simulation.speedKph} km/h</strong><span>simulated speed</span></div></div>
    {switchSuggested && recommendedRoute && <div className="route-switch-alert"><strong>Route switch available</strong><p>A simulated event affects the active corridor. The current recommendation is {recommendedRoute.label || 'another route'}.</p><button type="button" className="button button-caution" onClick={onSwitchRoute}>Switch to recommendation</button></div>}
    <div className="simulation-actions"><button type="button" className="button button-primary" disabled={!selectedRoute || ['running', 'paused'].includes(simulation.status)} onClick={onStart}>{simulation.status === 'completed' ? 'Restart movement' : 'Start movement'}</button><button type="button" className="button button-secondary" disabled={simulation.status !== 'running'} onClick={onPause}>Pause</button><button type="button" className="button button-secondary" disabled={simulation.status !== 'paused'} onClick={onResume}>Resume</button><button type="button" className="button button-secondary" disabled={simulation.status === 'idle'} onClick={onReset}>Reset</button></div>
    <label className="field-label speed-control">Simulation speed<select className="select-input" value={simulation.speedKph} onChange={(event) => onSpeedChange(Number(event.target.value))}>{SIMULATION_SPEED_OPTIONS.map((speed) => <option key={speed} value={speed}>{speed} km/h</option>)}</select></label>
    <p className="disclosure-text">Remaining time uses the selected simulation speed, independently of the route-scoring ETA. Route switches restart at pickup and pause. Movement is a demonstration, not live tracking.</p>
  </section>
);
