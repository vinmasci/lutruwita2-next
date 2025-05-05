/**
 * Utility for capturing console logs during specific operations
 */

let capturedLogs = [];
let isCapturing = false;
let originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

/**
 * Start capturing console logs
 */
export const startLogCapture = () => {
  capturedLogs = [];
  isCapturing = true;
  
  // Override console methods
  console.log = function(...args) {
    // Call original method
    originalConsole.log.apply(console, args);
    
    // Capture the log if it's related to saving
    if (isCapturing) {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Capture all logs during saving
      capturedLogs.push({
        type: 'log',
        message,
        timestamp: new Date()
      });
    }
  };
  
  console.warn = function(...args) {
    // Call original method
    originalConsole.warn.apply(console, args);
    
    // Capture the log if it's related to saving
    if (isCapturing) {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Capture all logs during saving
      capturedLogs.push({
        type: 'warn',
        message,
        timestamp: new Date()
      });
    }
  };
  
  console.error = function(...args) {
    // Call original method
    originalConsole.error.apply(console, args);
    
    // Capture the log if it's related to saving
    if (isCapturing) {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Capture all logs during saving
      capturedLogs.push({
        type: 'error',
        message,
        timestamp: new Date()
      });
    }
  };
};

/**
 * Stop capturing logs and restore original console methods
 */
export const stopLogCapture = () => {
  isCapturing = false;
  
  // Restore original console methods
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
};

/**
 * Get all captured logs
 * @returns {Array} Array of captured log objects
 */
export const getCapturedLogs = () => {
  return [...capturedLogs];
};
