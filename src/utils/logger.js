/**
 * Centralized logging utility to control logging across the application
 * Helps reduce excessive logging in production environments and on mobile devices
 */

const logger = {
  // Check if we're in production mode
  isProduction: process.env.NODE_ENV === 'production',
  
  // Check if we're on a mobile device
  isMobile: typeof window !== 'undefined' && 
    (window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)),
  
  // Log levels
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  
  // Store logs to avoid duplicates (especially useful for iOS)
  _recentLogs: new Map(),
  _maxRecentLogs: 50, // Reduced from 100 to 50 to save memory
  _logTTL: 2000, // Increased from 1000ms to 2000ms to further reduce duplicates
  
  /**
   * Check if this exact log was recently output to avoid duplicates
   * @param {string} level - Log level
   * @param {string} component - Component name
   * @param {string} message - Log message
   * @param {Array} args - Additional log arguments
   * @returns {boolean} - True if this is a duplicate recent log
   */
  _isDuplicateLog(level, component, message, args) {
    // Create a simpler key that doesn't stringify the entire args object
    // This reduces memory usage and processing time
    const simpleArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return Object.keys(arg).length; // Just use the object size as a fingerprint
      }
      return String(arg).substring(0, 20); // Truncate long strings
    });
    
    const key = `${level}:${component}:${message}:${simpleArgs.join(',')}`;
    const now = Date.now();
    
    // Clean up old logs more aggressively
    if (this._recentLogs.size > (this._maxRecentLogs / 2)) {
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
   * Log an error message (always logged, but with duplicate prevention)
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
   * Log a warning message (limited on mobile)
   * @param {string} component - Component name
   * @param {string} message - Log message
   * @param {...any} args - Additional log arguments
   */
  warn(component, message, ...args) {
    // On mobile in production, only log critical warnings
    if (this.isProduction && this.isMobile) {
      // Skip most warnings on mobile in production
      if (!message.includes('critical') && 
          !message.includes('error') && 
          !message.includes('failed')) {
        return;
      }
    }
    
    // Prevent duplicates
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
    // Skip all info logs on mobile in production
    if (this.isProduction && this.isMobile) {
      return;
    }
    
    // Only log info in development or if explicitly enabled
    if (!this.isProduction && !this._isDuplicateLog(this.INFO, component, message, args)) {
      console.log(`[${component}]`, message, ...args);
    }
  },
  
  /**
   * Log a debug message (only in development and not on mobile)
   * @param {string} component - Component name
   * @param {string} message - Log message
   * @param {...any} args - Additional log arguments
   */
  debug(component, message, ...args) {
    // Skip all debug logs on mobile
    if (this.isMobile) {
      return;
    }
    
    // Only log debug in development
    if (!this.isProduction && !this._isDuplicateLog(this.DEBUG, component, message, args)) {
      console.log(`[${component} DEBUG]`, message, ...args);
    }
  }
};

export default logger;
