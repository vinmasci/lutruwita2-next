/**
 * Adaptive Mapbox GL Loader
 * 
 * Dynamically selects the appropriate Mapbox GL implementation based on device type.
 * Uses the full version for desktop and the light version for mobile devices.
 */

import logger from '../utils/logger';

// Detect if we're on a mobile device
const isMobile = () => {
  return (
    window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
};

// Import both versions statically
import mapboxGlLight from './mapbox-gl-light';
import mapboxGlFull from './mapbox-gl-no-indoor';

// Select the appropriate version
const isMobileDevice = isMobile();
let mapboxgl;

if (isMobileDevice) {
  logger.info('mapbox-gl-adaptive', 'Mobile device detected, using Mapbox GL Light');
  mapboxgl = mapboxGlLight;
} else {
  logger.info('mapbox-gl-adaptive', 'Desktop device detected, using full Mapbox GL');
  mapboxgl = mapboxGlFull;
}

// Add feature detection helper
mapboxgl.isMobileVersion = isMobileDevice;

// Add global error handler for fetch aborts
if (typeof window !== 'undefined' && !window._fetchAbortHandlerAdded) {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && 
        event.reason.name === 'AbortError' && 
        event.reason.message && 
        event.reason.message.includes('Fetch is aborted')) {
      
      // Prevent the error from appearing in the console
      event.preventDefault();
      
      // Log it at debug level instead
      logger.debug('mapbox-gl-adaptive', 'Fetch abort handled gracefully:', event.reason.message);
    }
  });
  
  window._fetchAbortHandlerAdded = true;
  logger.info('mapbox-gl-adaptive', 'Added global error handler for fetch aborts');
}

export default mapboxgl;
