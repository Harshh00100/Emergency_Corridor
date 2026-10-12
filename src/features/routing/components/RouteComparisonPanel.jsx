import { EmptyState } from '../../../components/common/EmptyState';
import { ErrorState } from '../../../components/common/ErrorState';
import { LoadingState } from '../../../components/common/LoadingState';
import { RouteCard } from './RouteCard';
import { formatDistance, formatDuration } from '../../../utils/formatters';

export const RouteComparisonPanel = ({ routing, routes, recommendedRouteId, selectedRouteId, onSelect, onRetry }) => (
  <section className="panel route-panel">
    <div className="section-heading">
      <div><p className="eyebrow">03 · Route intelligence</p><h2>Compare alternatives</h2></div>
      {routes.length > 0 && <span className="section-note">Lower score is better</span>}
    </div>
    <p className="visually-hidden" aria-live="polite" aria-atomic="true">{routing.status === 'success' ? `${routes.length} route alternatives available. Recommended: ${routes.find((route) => route.id === recommendedRouteId)?.label || 'none'}.` : ''}</p>
    {routing.status === 'loading' && <LoadingState label="Requesting driving alternatives" />}
    {routing.status === 'error' && <ErrorState message={routing.error} onRetry={onRetry} compact />}
    {routing.status === 'idle' && <EmptyState title="Waiting for endpoints" message="Set both map endpoints to request route alternatives." />}
    {routing.status === 'success' && routes.length === 0 && <EmptyState title="No route alternatives" message="The service returned no usable driving geometry." />}
    {routes.length > 0 && <div className="route-card-list">{routes.map((route) => <RouteCard key={route.id} route={route} isRecommended={route.id === recommendedRouteId} isSelected={route.id === selectedRouteId} onSelect={onSelect} />)}</div>}
    {routes.length > 0 && <details className="comparison-table"><summary>Compare routes in a table</summary><div className="table-scroll" tabIndex="0" role="region" aria-label="Scrollable route comparison">
      <table><caption>Candidate routes — lower relative cost ranks first</caption><thead><tr><th scope="col">Route</th><th scope="col">Distance</th><th scope="col">Baseline</th><th scope="col">Adjusted</th><th scope="col">Cost</th><th scope="col">Selection</th></tr></thead>
        <tbody>{routes.map((route) => <tr key={route.id}><th scope="row">{route.label}{route.id === recommendedRouteId && ' · Recommended'}</th><td>{formatDistance(route.distanceMeters)}</td><td>{formatDuration(route.durationSeconds)}</td><td>{formatDuration(route.adjustedDurationSeconds)}</td><td>{route.score.toFixed(3)}</td><td><button type="button" className="button button-secondary" aria-pressed={route.id === selectedRouteId} onClick={() => onSelect(route.id)}>{route.id === selectedRouteId ? 'Selected' : 'Choose'} {route.label}</button></td></tr>)}</tbody>
      </table>
    </div></details>}
    {routing.fallbackReason && <><p className="fallback-note">Illustrative demo routes, not road-aligned. External request failed: {routing.fallbackReason}</p><button className="button button-secondary" type="button" onClick={onRetry}>Retry OSRM routes</button></>}
    {routes.length > 0 && <p className="disclosure-text">Baseline estimates: {routing.source === 'osrm' ? 'OSRM' : 'sample model'}. Adjusted times include simulated congestion and events. These penalties rerank candidates, they do not generate a road detour.</p>}
  </section>
);
