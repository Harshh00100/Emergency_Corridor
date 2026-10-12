export const LoadingState = ({ label = 'Loading data' }) => (
  <div className="loading-state" role="status" aria-live="polite">
    <span className="loading-indicator" aria-hidden="true" />
    <span>{label}</span>
  </div>
);
