import { getCache, setCache, clearCacheByPattern } from './redis';

// Surface cache prefix for Redis keys
const SURFACE_CACHE_PREFIX = 'surface:';

// Default cache expiry in seconds (7 days)
const DEFAULT_CACHE_EXPIRY = 60 * 60 * 24 * 7;

/**
 * Get surface type from cache
 * @param {number} longitude - Longitude coordinate
 * @param {number} latitude - Latitude coordinate
 * @returns {Promise<Object|null>} - Surface data or null if not found
 */
export async function getSurfaceFromCache(longitude, latitude) {
  const key = `${SURFACE_CACHE_PREFIX}${longitude},${latitude}`;
  return getCache(key);
}

/**
 * Store surface type in cache
 * @param {number} longitude - Longitude coordinate
 * @param {number} latitude - Latitude coordinate
 * @param {Object} surfaceData - Surface data to cache
 * @param {number} expiryInSeconds - Time until cache expires
 * @returns {Promise<boolean>} - Success status
 */
export async function cacheSurfaceType(longitude, latitude, surfaceData, expiryInSeconds = DEFAULT_CACHE_EXPIRY) {
  const key = `${SURFACE_CACHE_PREFIX}${longitude},${latitude}`;
  return setCache(key, surfaceData, expiryInSeconds);
}

/**
 * Store multiple surface types in cache
 * @param {Array<{longitude: number, latitude: number, surface: Object}>} surfaceEntries - Array of surface entries
 * @param {number} expiryInSeconds - Time until cache expires
 * @returns {Promise<boolean>} - Success status
 */
export async function cacheBatchSurfaceTypes(surfaceEntries, expiryInSeconds = DEFAULT_CACHE_EXPIRY) {
  try {
    const promises = surfaceEntries.map(entry => 
      cacheSurfaceType(entry.longitude, entry.latitude, entry.surface, expiryInSeconds)
    );
    
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('[Batch Surface Cache Error]', error);
    return false;
  }
}

/**
 * Clear all surface cache entries
 * @returns {Promise<boolean>} - Success status
 */
export async function clearSurfaceCache() {
  return clearCacheByPattern(`${SURFACE_CACHE_PREFIX}*`);
}

/**
 * Get surface types for a batch of coordinates
 * @param {Array<[number, number]>} coordinates - Array of [longitude, latitude] pairs
 * @returns {Promise<Array<{coordinates: [number, number], surface: Object|null}>>} - Array of results
 */
export async function getBatchSurfaceTypes(coordinates) {
  try {
    const promises = coordinates.map(async ([longitude, latitude]) => {
      const surface = await getSurfaceFromCache(longitude, latitude);
      return {
        coordinates: [longitude, latitude],
        surface
      };
    });
    
    return Promise.all(promises);
  } catch (error) {
    console.error('[Batch Surface Get Error]', error);
    return coordinates.map(coords => ({
      coordinates: coords,
      surface: null
    }));
  }
}
