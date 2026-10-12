import { StatusBadge } from '../../../components/common/StatusBadge';
import { ROUTE_SCORING_WEIGHTS } from '../../../constants/scoring';

export const TransparencyPanel = ({ routeSource, hospitalSource, trafficSignalSource, incidentsCount }) => (
  <section className="panel transparency-panel">
    <div className="section-heading"><div><p className="eyebrow">System disclosure</p><h2>Data and simulation boundary</h2></div><StatusBadge tone="caution">Prototype</StatusBadge></div>
     <dl className="transparency-list"><div><dt>Map tiles</dt><dd>OpenStreetMap <StatusBadge tone="positive">External</StatusBadge></dd></div><div><dt>Route geometry</dt><dd>{routeSource === 'osrm' ? <>OSRM <StatusBadge tone="positive">External</StatusBadge></> : routeSource === 'demo' ? <>Demo fallback <StatusBadge tone="caution">Simulated</StatusBadge></> : 'Not requested'}</dd></div><div><dt>Hospital points</dt><dd>{hospitalSource === 'openstreetmap' ? 'OpenStreetMap' : hospitalSource === 'demo' ? 'Sample fallback' : 'Not loaded'}</dd></div><div><dt>Traffic signals</dt><dd>{trafficSignalSource === 'openstreetmap' ? 'OpenStreetMap' : trafficSignalSource === 'demo' ? 'Sample fallback' : 'Not loaded'}</dd></div><div><dt>Traffic and incidents</dt><dd>{incidentsCount > 0 ? `${incidentsCount} simulated event${incidentsCount > 1 ? 's' : ''}` : 'Simulated scoring only'}</dd></div><div><dt>Ambulance location</dt><dd>Timer simulation</dd></div></dl>
     <p className="disclosure-text">The recommendation combines public route estimates with explicitly simulated penalties. No live traffic, accident detection, bed availability, dispatch control, or live signal control is integrated.</p>
    <details className="scoring-disclosure"><summary>How the route cost is calculated</summary>
      <p>Metrics are min-max normalized across the available routes. Equal values contribute zero. Lower weighted cost ranks first.</p>
      <p>Travel time: {ROUTE_SCORING_WEIGHTS.travelTime * 100}%. Distance: {ROUTE_SCORING_WEIGHTS.distance * 100}%. Simulated congestion: {ROUTE_SCORING_WEIGHTS.congestion * 100}%. Simulated incidents: {ROUTE_SCORING_WEIGHTS.incidents * 100}%.</p>
      <p>Adjusted seconds = baseline seconds × (1 + 0.75 × congestion + incident penalty). This is a deterministic heuristic, not a trained AI model. Cost is relative to the candidates, not a probability or safety guarantee. A blockage changes penalties; it does not exclude roads from OSRM.</p>
    </details>
  </section>
);
