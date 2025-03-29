/**
 * Utility functions for navigation between map views
 */

/**
 * Adds a small delay before navigation to ensure map resources are properly cleaned up
 * This helps prevent the "undefined is not an object (evaluating 'this.style.getOwnLayer')" error
 * 
 * @param {Function} navigate - The navigation function to call (e.g., from react-router)
 * @param {string} path - The path to navigate to
 * @param {Object} options - Additional options for navigation
 * @param {number} options.delay - The delay in milliseconds (default: 100)
 * @returns {void}
 */
export const safeNavigate = (navigate, path, options = {}) => {
  const delay = options.delay || 100;
  
  // Log the navigation intent
  console.log(`[Navigation] Preparing to navigate to ${path} with ${delay}ms delay`);
  
  // Add a small delay to ensure map cleanup completes
  setTimeout(() => {
    console.log(`[Navigation] Navigating to ${path}`);
    navigate(path, options);
  }, delay);
};

/**
 * Creates a wrapper around a click handler that adds a delay before navigation
 * Useful for onClick handlers in navigation links
 * 
 * @param {Function} handler - The original click handler
 * @param {Object} options - Additional options
 * @param {number} options.delay - The delay in milliseconds (default: 100)
 * @returns {Function} A wrapped handler with delay
 */
export const withNavigationDelay = (handler, options = {}) => {
  return (event) => {
    // Prevent default link behavior
    event.preventDefault();
    
    // Get delay from options or use default
    const delay = options.delay || 100;
    
    // Log the navigation intent
    console.log(`[Navigation] Handling click with ${delay}ms delay`);
    
    // Add a small delay to ensure map cleanup completes
    setTimeout(() => {
      handler(event);
    }, delay);
  };
};
