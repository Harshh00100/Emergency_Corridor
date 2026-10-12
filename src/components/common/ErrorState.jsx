export const ErrorState = ({ message, onRetry, compact = false }) => (
  <div className={`error-state${compact ? ' error-state-compact' : ''}`} role="alert">
    <strong>Service unavailable</strong>
    <p>{message}</p>
    {onRetry && <button type="button" className="button button-secondary" onClick={onRetry}>Retry request</button>}
  </div>
);
