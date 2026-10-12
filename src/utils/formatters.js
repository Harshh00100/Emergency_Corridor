export const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return 'Unavailable';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return 'Unavailable';
  if (seconds <= 0) return '0 min';
  if (seconds < 60) return '<1 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
};

export const formatTime = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatPercent = (value) => `${Math.round(value * 100)}%`;
