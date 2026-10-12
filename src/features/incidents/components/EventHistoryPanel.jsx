import { EmptyState } from '../../../components/common/EmptyState';
import { formatTime } from '../../../utils/formatters';

export const EventHistoryPanel = ({ history }) => (
  <section className="panel history-panel">
    <div className="section-heading"><div><p className="eyebrow">06 · Audit trail</p><h2>Event history</h2></div><span className="section-note">Latest 40 scenario events</span></div>
    {history.length === 0 ? <EmptyState title="No events recorded" message="Route and incident actions will appear here." /> : <div className="history-list">{history.map((event) => <div className="history-item" key={event.id}><span className="history-marker" /><div><strong>{event.label}</strong><p>{event.detail}</p></div><time>{formatTime(event.timestamp)}</time></div>)}</div>}
  </section>
);
