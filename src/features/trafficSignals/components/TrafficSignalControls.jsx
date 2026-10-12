import { EmptyState } from '../../../components/common/EmptyState';
import { LoadingState } from '../../../components/common/LoadingState';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { env } from '../../../config/env';
import { formatDistance, formatTime } from '../../../utils/formatters';

export const TrafficSignalControls = ({ pickup, signals, nearestSignal, clearance, onRequestClearance, onRetry }) => {
  const isGateway = Boolean(env.signalAlertUrl);
  const ready = pickup && signals.status === 'success';
  const sampleBlocked = isGateway && nearestSignal?.source === 'demo';
  const targetStatus = clearance.signalId === nearestSignal?.id ? clearance.status : 'idle';
  const complete = ['demo', 'accepted'].includes(targetStatus);
  return (
    <section className="panel control-section signal-panel" aria-labelledby="signal-panel-title">
      <div className="section-heading">
        <div><p className="eyebrow">03 · Signal coordination</p><h2 id="signal-panel-title">Request traffic clearance</h2></div>
        <StatusBadge tone={isGateway ? 'neutral' : 'caution'}>{isGateway ? 'HTTP gateway' : 'Demo alerts'}</StatusBadge>
      </div>
      {!pickup && <EmptyState title="Set a pickup first" message="Searches for mapped traffic signals within 2 km of the pickup." />}
      {pickup && signals.status === 'loading' && <LoadingState label="Finding nearby traffic signals" />}
      {pickup && signals.status === 'error' && <div className="inline-error" role="alert"><span>{signals.error}</span></div>}
      {ready && !nearestSignal && <EmptyState title="No signal found within 2 km" message="Choose another pickup or retry the search. No signal target has been invented." />}
      {ready && nearestSignal && <>
        <div className="signal-target">
          <span className="traffic-light-symbol" aria-hidden="true"><i /><i /><i /></span>
          <div><span className="signal-target-label">Nearest to pickup · straight-line distance</span><strong>{nearestSignal.name}</strong><small>{nearestSignal.roadName} · {formatDistance(nearestSignal.distanceMeters)}</small><small>{nearestSignal.source === 'demo' ? 'Illustrative sample location' : 'OpenStreetMap location · phase unknown'}</small></div>
        </div>
        {complete ? <div className="signal-confirmation" role="status">
          <strong>{targetStatus === 'accepted' ? 'Gateway accepted the alert' : 'Demo clearance alert recorded'}</strong>
          <span>Target: {nearestSignal.name}</span>
          <small>{formatTime(clearance.requestedAt)} · {targetStatus === 'demo' ? 'Local simulation only' : `Receipt ${clearance.receiptId}`}</small>
        </div> : <>
          {targetStatus === 'error' && <p className="inline-error" role="alert">{clearance.error}</p>}
          <button type="button" className="button button-primary button-wide" disabled={targetStatus === 'pending' || sampleBlocked} onClick={onRequestClearance}>
            {targetStatus === 'pending' ? 'Sending clearance alert…' : targetStatus === 'error' ? 'Retry clearance alert' : isGateway ? 'Send clearance alert to nearest signal' : 'Simulate clearance alert to nearest signal'}
          </button>
        </>}
        {sampleBlocked && <p className="selection-note">Sample locations cannot be sent to the gateway. Refresh to load mapped signals.</p>}
      </>}
      {pickup && <button type="button" className="button button-secondary refresh-hospitals" disabled={signals.status === 'loading' || clearance.status === 'pending'} onClick={onRetry}>Refresh traffic signals</button>}
      {signals.fallbackReason && <p className="fallback-note">Sample signals active: {signals.fallbackReason}</p>}
      <p className="disclosure-text">{isGateway ? 'Alerts are sent to the configured gateway. A receipt confirms acceptance, not a green light or road clearance.' : 'Demo alerts are recorded in this browser only. Connect a traffic-management gateway to deliver real alert requests.'}</p>
    </section>
  );
};
