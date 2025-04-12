/**
 * Script to clear photo cache and force reload of photos
 * 
 * This script can be run from the browser console to clear the photo cache
 * and force a reload of photos from the server.
 * 
 * Usage:
 * 1. Open the browser console (F12 or Ctrl+Shift+I)
 * 2. Copy and paste the following code:
 *    import('/src/features/photo/utils/clearPhotoCache.js').then(module => module.clearCacheAndReload())
 * 3. Press Enter to execute
 */

import { clearAllPhotoCaches } from './photoCacheUtils';

/**
 * Clears the photo cache and forces a reload of the current page
 */
export const clearCacheAndReload = () => {
  console.log('=== PHOTO CACHE CLEARING UTILITY ===');
  console.log('Clearing all photo caches...');
  
  // Clear all photo caches
  const result = clearAllPhotoCaches();
  
  if (result) {
    console.log('✅ All photo caches cleared successfully');
    console.log('To see the changes, you need to reload the page or navigate to a different route and back');
    
    // Ask the user if they want to reload the page
    if (window.confirm('Photo caches cleared. Reload the page now to see changes?')) {
      console.log('Reloading page...');
      window.location.reload();
    } else {
      console.log('Page not reloaded. Changes will take effect when you navigate or reload manually.');
    }
  } else {
    console.error('❌ Failed to clear photo caches');
  }
  
  return true;
};

// If this script is loaded directly, execute the clearCacheAndReload function
if (typeof window !== 'undefined' && window.document) {
  console.log('Photo cache clearing utility loaded');
  console.log('Run clearCacheAndReload() to clear caches and reload the page');
}
