/**
 * Utility functions for managing photo caching
 */

import { clearPhotoCache } from '../../presentation/components/PhotoLayer/PresentationPhotoLayer';

/**
 * Clears the photo cache to force reloading photos from the server
 * This is useful when captions or other photo properties are not being displayed correctly
 */
export const clearAllPhotoCaches = () => {
  console.log('[photoCacheUtils] Clearing all photo caches');
  
  // Clear the PresentationPhotoLayer cache
  clearPhotoCache();
  
  // Add any other cache clearing functions here if needed
  
  console.log('[photoCacheUtils] All photo caches cleared');
  return true;
};

/**
 * Utility function to force reload of photos for a specific route
 * @param {string} routeId - The ID of the route to reload photos for
 */
export const forceReloadPhotosForRoute = (routeId) => {
  console.log(`[photoCacheUtils] Forcing reload of photos for route: ${routeId}`);
  
  // For now, just clear all caches
  // In the future, we could implement more targeted cache clearing
  clearAllPhotoCaches();
  
  return true;
};
