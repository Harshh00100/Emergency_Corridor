import { endpoints } from './endpoints';
import { requestJson } from './httpClient';
import { ApiError } from '../errors/ApiError';
import { transformHospitalElement } from '../../features/hospitals/utils/hospitalData';
import { transformTrafficSignalElement } from '../../features/trafficSignals/utils/signalData';
import { isValidCoordinate } from '../../utils/coordinates';

const makeQuery = ({ bounds, center, radiusMeters, query = 'hospital' }) => {
  const safeQuery = query.trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 60);
  const nameFilter = safeQuery ? ` [name~"${safeQuery}",i]` : '';
  const area = center ? `around:${radiusMeters},${center.lat.toFixed(6)},${center.lng.toFixed(6)}` : bounds.join(',');
  return `[out:json][timeout:15];(nwr[amenity=hospital]${nameFilter}(${area}););out center tags;`;
};

const makeTrafficSignalQuery = ({ center, radiusMeters }) => `[out:json][timeout:15];node[highway=traffic_signals](around:${radiusMeters},${center.lat.toFixed(6)},${center.lng.toFixed(6)});out tags;`;

export const getHospitals = async ({ bounds, center, radiusMeters = 10000, query = '', signal }) => {
  if (center !== undefined) {
    if (!isValidCoordinate(center) || !Number.isFinite(radiusMeters) || radiusMeters < 2000 || radiusMeters > 50000) {
      throw new ApiError('A valid hospital search location and radius are required.', { code: 'INVALID_COORDINATES' });
    }
  } else if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(Number.isFinite) ||
    bounds[0] < -90 || bounds[2] > 90 || bounds[1] < -180 || bounds[3] > 180 ||
    bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) {
    throw new ApiError('A valid map bounding box is required.', { code: 'INVALID_BOUNDS' });
  }
  const payload = await requestJson(endpoints.overpass, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: makeQuery({ bounds, center, radiusMeters, query })
  });
  if (payload?.remark || !Array.isArray(payload?.elements)) {
    throw new ApiError('The hospital response was incomplete.', { code: 'INVALID_RESPONSE' });
  }
  const hospitals = payload.elements.map(transformHospitalElement).filter(Boolean);
  if (payload.elements.length && !hospitals.length) {
    throw new ApiError('No hospital records had usable coordinates.', { code: 'INVALID_RESPONSE' });
  }
  return [...new Map(hospitals.map((hospital) => [hospital.id, hospital])).values()];
};

export const getTrafficSignals = async ({ center, radiusMeters = 2000, signal }) => {
  if (!isValidCoordinate(center) || !Number.isFinite(radiusMeters) || radiusMeters < 100 || radiusMeters > 5000) {
    throw new ApiError('A valid signal search location and radius are required.', { code: 'INVALID_SIGNAL_SEARCH' });
  }
  const payload = await requestJson(endpoints.overpass, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: makeTrafficSignalQuery({ center, radiusMeters })
  });
  if (payload?.remark || !Array.isArray(payload?.elements)) {
    throw new ApiError('The traffic signal response was incomplete.', { code: 'INVALID_RESPONSE' });
  }
  const signals = payload.elements.map(transformTrafficSignalElement).filter(Boolean);
  return [...new Map(signals.map((item) => [item.id, item])).values()];
};
