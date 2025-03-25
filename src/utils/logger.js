/**
 * Centralized logging utility to control logging across the application
 * Helps reduce excessive logging in production environments
 */

const logger = {
  // Check if we're in production mode
  isProduction: process.env.NODE_ENV === 'production',
  
  // Log levels
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  
  // Store logs to avoid duplicates (especially useful for iOS)
  _recentLogs: new Map(),
  _maxRecentLogs: 100,
  _logTTL: 1000, // 1 second TTL for duplicate prevention
  
  /**
   * Check if this exact log was recently output to avoid duplicates
   * @param {string} level - Log level
   * @param {string} component - Component name
   * @param {string} message - Log message
   * @param {Array} args - Additional log arguments
   * @returns {boolean} - True if this is a duplicate recent log
   */
  _isDuplicateLog(level, component, message, args) {
    const key = `${level}:${component}:${message}:${JSON.stringify(args)}`;
    const now = Date.now();
    
    // Clean up old logs
    if (this._recentLogs.size > this._maxRecentLogs) {
      for (const [logKey, timestamp] of this._recentLogs.entries()) {
        if (now - timestamp > this._logTTL) {
          this._recentLogs.delete(logKey);
        }
      }
    }
    
    // Check if this is a duplicate
    if (this._recentLogs.has(key)) {
      const timestamp = this._recentLogs.get(key);
      if (now - timestamp < this._logTTL) {
        return true;
      }
    }
    
    // Not a duplicate, add to recent logs
    this._recentLogs.set(key, now);
    return false;
  },
  
  /**
   * Log an error message (always logged)
   * @param {string} component - Component name
   * @param {string} message - Log message
   * @param {...any} args - Additional log arguments
   */
  error(component, message, ...args) {
    // Always log errors, but still prevent duplicates
    if (!this._isDuplicateLog(this.ERROR, component, message, args)) {
      console.error(`[${component}]`, message, ...args);
    }
  },
  
  /**
   * Log a warning message (always logged)
   * @param {string} component - Component name
   * @param {string} message - Log message
   * @param {...any} args - Additional log arguments
   */
  warn(component, message, ...args) {
    // Always log warnings, but still prevent duplicates
    if (!this._isDuplicateLog(this.WARN, component, message, args)) {
      console.warn(`[${component}]`, message, ...args);
    }
  },
  
  /**
   * Log an info message (only in development or if explicitly enabled)
   * @param {string} component - Component name
   * @param {string} message - Log message
   * @param {...any} args - Additional log arguments
   */
  info(component, message, ...args) {
    // Only log info in development or if explicitly enabled
    if (!this.isProduction && !this._isDuplicateLog(this.INFO, component, message, args)) {
      console.log(`[${component}]`, message, ...args);
    }
  },
  
  /**
   * Log a debug message (only in development)
   * @param {string} component - Component name
   * @param {string} message - Log message
   * @param {...any} args - Additional log arguments
   */
  debug(component, message, ...args) {
    // Only log debug in development
    if (!this.isProduction && !this._isDuplicateLog(this.DEBUG, component, message, args)) {
      console.log(`[${component} DEBUG]`, message, ...args);
    }
  }
};

export default logger;
