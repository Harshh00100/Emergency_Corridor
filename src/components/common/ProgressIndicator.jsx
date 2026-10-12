export const ProgressIndicator = ({ value, label }) => (
  <div className="progress-indicator">
    <div className="progress-label"><span>{label}</span><span>{Math.round(value * 100)}%</span></div>
    <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(value * 100)}>
      <span style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  </div>
);
