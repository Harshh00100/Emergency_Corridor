import { isValidCoordinate } from '../../../utils/coordinates';
import { sortByDistanceFrom } from '../../../utils/geography';

export const transformHospitalElement = (element) => {
  if (!element || !['node', 'way', 'relation'].includes(element.type) || !Number.isFinite(element.id)) return null;
  const coordinate = { lat: element.lat ?? element.center?.lat, lng: element.lon ?? element.center?.lon };
  if (!isValidCoordinate(coordinate)) return null;
  const tags = Object.fromEntries(Object.entries(element.tags || {}).filter(([, value]) => typeof value === 'string'));
  return {
    id: `osm-${element.type}-${element.id}`,
    name: tags.name || 'Unnamed hospital',
    ...coordinate,
    address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || 'Address not provided by OpenStreetMap',
    source: 'openstreetmap',
    tags
  };
};

export const filterHospitals = (hospitals, searchTerm) => {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) return hospitals;
  return hospitals.filter((hospital) => `${hospital.name} ${hospital.address}`.toLowerCase().includes(normalized));
};

export const getHospitalsWithinRadius = (hospitals, pickup, radiusMeters = 2000) => (
  sortByDistanceFrom(hospitals, pickup).filter((hospital) => hospital.distanceMeters <= radiusMeters)
);
