import { StatusBadge } from '../../../components/common/StatusBadge';
import { formatDistance, formatDuration, formatPercent } from '../../../utils/formatters';

export const RouteCard = ({ route, isRecommended, isSelected, onSelect, interactive = true }) => {
  const content = <>
    <div className="route-card-topline">
      <span className="route-number">{String(route.rank).padStart(2, '0')}</span>
      <span className="route-name">{route.label || `Route ${route.rank}`}</span>
      {isRecommended && <StatusBadge tone="positive">{interactive ? 'Recommended' : 'Best alternate'}</StatusBadge>}
    </div>
    <div className="route-metrics">
      <span><strong>{formatDuration(route.adjustedDurationSeconds)}</strong><small>adjusted time</small></span>
      <span><strong>{formatDistance(route.distanceMeters)}</strong><small>route distance</small></span>
      <span><strong>{formatPercent(route.congestion)}</strong><small>sim. congestion</small></span>
    </div>
    <div className="route-baseline">Baseline {formatDuration(route.durationSeconds)} · Simulated delay +{formatDuration(route.adjustedDurationSeconds - route.durationSeconds)} · {route.affectedIncidents.length} event(s)</div>
    <div className="route-card-footer"><span>Cost {route.score.toFixed(3)}</span><span>{interactive ? (isSelected ? 'Selected for simulation' : 'Select route') : 'Starts at reported blockage'}</span></div>
  </>;
  const className = `route-card${isRecommended ? ' route-card-recommended' : ''}${isSelected ? ' route-card-selected' : ''}${!interactive ? ' route-card-static' : ''}`;
  return interactive
    ? <button type="button" aria-pressed={isSelected} className={className} onClick={() => onSelect(route.id)}>{content}</button>
    : <article className={className}>{content}</article>;
};
