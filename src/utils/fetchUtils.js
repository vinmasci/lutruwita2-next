/**
 * Utility functions for handling fetch operations with proper error handling
 */

/**
 * Performs a fetch operation with timeout and proper error handling
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Response>} - The fetch response
 */
export const safeFetch = async (url, options = {}, timeout = 10000) => {
  // Create an abort controller for the timeout
  const controller = new AbortController();
  const signal = controller.signal;
  
  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      controller.abort();
      reject(new Error(`Fetch timeout for ${url}`));
    }, timeout);
  });
  
  try {
    // Race the fetch against the timeout
    const response = await Promise.race([
      fetch(url, { ...options, signal }),
      timeoutPromise
    ]);
    
    // Check if the response is ok
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    // Handle AbortError specifically
    if (error.name === 'AbortError') {
      console.warn(`[fetchUtils] Fetch aborted for ${url}`);
      throw new Error(`Fetch aborted for ${url}`);
    }
    
    // Handle network errors
    console.error(`[fetchUtils] Fetch error for ${url}:`, error);
    throw error;
  }
};

/**
 * Performs a fetch operation and returns the JSON response with proper error handling
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Object>} - The parsed JSON response
 */
export const safeJsonFetch = async (url, options = {}, timeout = 10000) => {
  try {
    const response = await safeFetch(url, options, timeout);
    return await response.json();
  } catch (error) {
    console.error(`[fetchUtils] JSON fetch error for ${url}:`, error);
    throw error;
  }
};

/**
 * Performs a fetch operation with retry logic
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} delay - Delay between retries in milliseconds (default: 1000)
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Response>} - The fetch response
 */
export const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1000, timeout = 10000) => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await safeFetch(url, options, timeout);
    } catch (error) {
      lastError = error;
      
      // Don't wait on the last attempt
      if (i < retries - 1) {
        console.warn(`[fetchUtils] Retry ${i + 1}/${retries} for ${url}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Performs a fetch operation and returns the JSON response with retry logic
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} delay - Delay between retries in milliseconds (default: 1000)
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Object>} - The parsed JSON response
 */
export const jsonFetchWithRetry = async (url, options = {}, retries = 3, delay = 1000, timeout = 10000) => {
  try {
    const response = await fetchWithRetry(url, options, retries, delay, timeout);
    return await response.json();
  } catch (error) {
    console.error(`[fetchUtils] JSON fetch with retry error for ${url}:`, error);
    throw error;
  }
};
