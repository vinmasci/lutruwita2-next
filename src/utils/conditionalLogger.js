/**
 * Conditional logging utility to reduce console output in production
 * Only logs in development mode when VITE_DEBUG_LOGGING is enabled
 */

/**
 * Log a message only in development mode with debug logging enabled
 * @param {string} component - Component name for log prefix
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export const devLog = (component, message, data) => {
  if (process.env.NODE_ENV === 'development' && process.env.VITE_DEBUG_LOGGING === 'true') {
    if (data !== undefined) {
      console.log(`[${component}] ${message}`, data);
    } else {
      console.log(`[${component}] ${message}`);
    }
  }
};

/**
 * Log a warning only in development mode with debug logging enabled
 * @param {string} component - Component name for log prefix
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export const devWarn = (component, message, data) => {
  if (process.env.NODE_ENV === 'development' && process.env.VITE_DEBUG_LOGGING === 'true') {
    if (data !== undefined) {
      console.warn(`[${component}] ${message}`, data);
    } else {
      console.warn(`[${component}] ${message}`);
    }
  }
};

/**
 * Log an error in both development and production
 * @param {string} component - Component name for log prefix
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
export const errorLog = (component, message, data) => {
  if (data !== undefined) {
    console.error(`[${component}] ${message}`, data);
  } else {
    console.error(`[${component}] ${message}`);
  }
};
