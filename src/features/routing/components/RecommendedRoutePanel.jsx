import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDistance, formatDuration } from '../../../utils/formatters';

export const RecommendedRoutePanel = ({ route, explanation, source, onSelect }) => (
  <section className="panel recommendation-panel">
    <div className="section-heading"><div><p className="eyebrow">Dispatch recommendation</p><h2>Recommended corridor</h2></div>{route && <StatusBadge tone="positive">Rank 01</StatusBadge>}</div>
    {route ? (
      <>
        <div className="recommendation-title"><div><h3>{route.label || 'Selected corridor'}</h3><p>Source: {source === 'demo' ? 'Illustrative geometry, not road-aligned' : 'OSRM road geometry'}</p></div></div>
        <div className="recommendation-metrics"><div><strong>{formatDuration(route.adjustedDurationSeconds)}</strong><span>simulated ETA</span></div><div><strong>{formatDistance(route.distanceMeters)}</strong><span>route distance</span></div><div><strong>{route.score.toFixed(3)}</strong><span>relative cost (0 to 1)</span></div></div>
        <p className="recommendation-explanation">{explanation}</p>
        <button type="button" className="button button-primary button-wide" onClick={() => onSelect(route.id)}>Select recommended corridor</button>
      </>
    ) : <p className="muted-copy">A recommendation will appear after route alternatives are available.</p>}
  </section>
);
