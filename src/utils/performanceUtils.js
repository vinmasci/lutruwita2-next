/**
 * Utility functions for performance measurement and optimization
 */

// Store performance measurements
const performanceMeasurements = {};

/**
 * Wraps a function with performance timing and logs the execution time
 * 
 * @param {Function} fn - The function to wrap
 * @param {string} name - A name to identify the function in logs
 * @param {Object} options - Additional options
 * @param {boolean} options.logToConsole - Whether to log to console (default: true)
 * @param {boolean} options.storeResults - Whether to store results for later analysis (default: true)
 * @returns {Function} The wrapped function
 */
export const withPerformanceTracking = (fn, name, options = {}) => {
  const { logToConsole = true, storeResults = true } = options;
  
  // Initialize measurements array for this function if it doesn't exist
  if (storeResults && !performanceMeasurements[name]) {
    performanceMeasurements[name] = [];
  }
  
  return function(...args) {
    // Start timing
    const startTime = performance.now();
    
    // Call the original function
    const result = fn.apply(this, args);
    
    // If the result is a Promise, measure when it resolves
    if (result && typeof result.then === 'function') {
      return result.then(resolvedResult => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (logToConsole) {
          console.log(`[Performance] ${name} took ${duration.toFixed(2)}ms (async)`);
        }
        
        if (storeResults) {
          performanceMeasurements[name].push({
            duration,
            timestamp: new Date().toISOString(),
            async: true
          });
        }
        
        return resolvedResult;
      }).catch(error => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (logToConsole) {
          console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms (async)`, error);
        }
        
        if (storeResults) {
          performanceMeasurements[name].push({
            duration,
            timestamp: new Date().toISOString(),
            async: true,
            error: true
          });
        }
        
        throw error;
      });
    }
    
    // For synchronous functions, measure immediately
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (logToConsole) {
      console.log(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
    }
    
    if (storeResults) {
      performanceMeasurements[name].push({
        duration,
        timestamp: new Date().toISOString(),
        async: false
      });
    }
    
    return result;
  };
};

/**
 * Wraps a React component with performance timing
 * 
 * @param {React.Component} Component - The React component to wrap
 * @param {string} name - A name to identify the component in logs
 * @returns {React.Component} The wrapped component
 */
export const withComponentPerformanceTracking = (Component, name) => {
  // Import React dynamically to avoid issues
  return function WrappedComponent(props) {
    const React = require('react');
    const startTime = performance.now();
    
    // Log render start
    console.log(`[Performance] ${name} render started`);
    
    // Create a ref to track mount/update/unmount
    const componentRef = React.useRef({
      mountTime: null,
      updateCount: 0
    });
    
    // Use useEffect to track mount time
    React.useEffect(() => {
      const mountTime = performance.now();
      componentRef.current.mountTime = mountTime;
      const renderDuration = mountTime - startTime;
      
      console.log(`[Performance] ${name} mounted in ${renderDuration.toFixed(2)}ms`);
      
      // Cleanup function for unmount
      return () => {
        const unmountTime = performance.now();
        const lifetimeDuration = unmountTime - componentRef.current.mountTime;
        
        console.log(`[Performance] ${name} unmounted after ${lifetimeDuration.toFixed(2)}ms total lifetime with ${componentRef.current.updateCount} updates`);
      };
    }, []);
    
    // Use useEffect with deps to track updates
    React.useEffect(() => {
      if (componentRef.current.mountTime) {
        componentRef.current.updateCount++;
        console.log(`[Performance] ${name} updated (${componentRef.current.updateCount} updates total)`);
      }
    });
    
    // Render the component using React.createElement instead of JSX
    return React.createElement(Component, props);
  };
};

/**
 * Gets all stored performance measurements
 * 
 * @returns {Object} The performance measurements object
 */
export const getPerformanceMeasurements = () => {
  return performanceMeasurements;
};

/**
 * Logs a summary of all performance measurements
 */
export const logPerformanceSummary = () => {
  console.group('Performance Summary');
  
  Object.entries(performanceMeasurements).forEach(([name, measurements]) => {
    if (measurements.length === 0) return;
    
    // Calculate statistics
    const durations = measurements.map(m => m.duration);
    const total = durations.reduce((sum, duration) => sum + duration, 0);
    const average = total / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    
    console.log(`${name}:`);
    console.log(`  Calls: ${measurements.length}`);
    console.log(`  Average: ${average.toFixed(2)}ms`);
    console.log(`  Min: ${min.toFixed(2)}ms`);
    console.log(`  Max: ${max.toFixed(2)}ms`);
    console.log(`  Total: ${total.toFixed(2)}ms`);
  });
  
  console.groupEnd();
};

/**
 * Clears all stored performance measurements
 */
export const clearPerformanceMeasurements = () => {
  Object.keys(performanceMeasurements).forEach(key => {
    performanceMeasurements[key] = [];
  });
};
