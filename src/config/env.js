// Invalid public settings fall back safely and are disclosed in the dashboard.
export const parseEnvironment = (settings = {}) => {
  const warnings = [];
  const number = (key, fallback, minimum, maximum) => {
    const raw = settings[key];
    if (raw === undefined || raw === '') return fallback;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum) return parsed;
    warnings.push(`${key} is invalid. Using ${fallback}.`);
    return fallback;
  };
  const url = (key, fallback) => {
    if (!settings[key]) return fallback;
    try {
      const parsed = new URL(settings[key]);
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error();
      return parsed.href.replace(/\/$/, '');
    } catch {
      warnings.push(`${key} is invalid. Using the default public endpoint.`);
      return fallback;
    }
  };
  const optionalUrl = (key) => {
    if (!settings[key]) return '';
    try {
      const parsed = new URL(settings[key]);
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error();
      return parsed.href.replace(/\/$/, '');
    } catch {
      warnings.push(`${key} is invalid. Signal alerts are disabled.`);
      return '';
    }
  };
  const fallbackSetting = settings.VITE_ENABLE_DEMO_FALLBACK?.toLowerCase();
  if (fallbackSetting && !['true', 'false'].includes(fallbackSetting)) warnings.push('VITE_ENABLE_DEMO_FALLBACK is invalid. Using true.');
  return {
    config: Object.freeze({
      osrmBaseUrl: url('VITE_OSRM_BASE_URL', 'https://router.project-osrm.org'),
      overpassApiUrl: url('VITE_OVERPASS_API_URL', 'https://overpass-api.de/api/interpreter'),
      signalAlertUrl: optionalUrl('VITE_SIGNAL_ALERT_URL'),
      defaultMap: Object.freeze({
        lat: number('VITE_DEFAULT_MAP_LAT', 28.6139, -85, 85),
        lng: number('VITE_DEFAULT_MAP_LNG', 77.209, -180, 180),
        zoom: number('VITE_DEFAULT_MAP_ZOOM', 11, 1, 19)
      }),
      requestTimeoutMs: number('VITE_REQUEST_TIMEOUT_MS', 8000, 1000, 60000),
      enableDemoFallback: fallbackSetting !== 'false'
    }),
    warnings
  };
};

const configuration = parseEnvironment(import.meta.env);
export const env = configuration.config;
export const environmentWarnings = configuration.warnings;
