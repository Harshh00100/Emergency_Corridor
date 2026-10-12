import { env } from '../../config/env';

export const endpoints = Object.freeze({
  osrmRoute: `${env.osrmBaseUrl.replace(/\/$/, '')}/route/v1/driving`,
  overpass: env.overpassApiUrl
});
