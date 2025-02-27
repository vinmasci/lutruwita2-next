/**
 * Authentication utility functions for managing stored authentication data
 */

/**
 * Check if there is valid stored authentication data in localStorage
 * @returns boolean indicating if valid authentication data exists
 */
export const hasStoredAuthentication = (): boolean => {
  try {
    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token');
    const storedTimestamp = localStorage.getItem('auth_timestamp');
    
    if (!storedUser || !storedToken || !storedTimestamp) {
      return false;
    }
    
    // Check if token is not expired (24 hours validity)
    const timestamp = parseInt(storedTimestamp, 10);
    const now = Date.now();
    const tokenAge = now - timestamp;
    const tokenMaxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    return tokenAge <= tokenMaxAge;
  } catch (e) {
    console.error('Error checking stored authentication:', e);
    return false;
  }
};

/**
 * Get the stored user data from localStorage
 * @returns The stored user object or null if not found
 */
export const getStoredUser = (): any => {
  try {
    const storedUser = localStorage.getItem('auth_user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (e) {
    console.error('Error getting stored user:', e);
    return null;
  }
};

/**
 * Get the stored authentication token from localStorage
 * @returns The stored token or null if not found
 */
export const getStoredToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

/**
 * Clear all stored authentication data from localStorage
 */
export const clearStoredAuthentication = (): void => {
  localStorage.removeItem('auth_user');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_timestamp');
};

/**
 * Store authentication data in localStorage
 * @param user The user object to store
 * @param token The authentication token to store
 */
export const storeAuthentication = (user: any, token: string): void => {
  localStorage.setItem('auth_user', JSON.stringify(user));
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_timestamp', Date.now().toString());
};

/**
 * Get the remaining validity time of the stored token in milliseconds
 * @returns The remaining validity time in milliseconds, or 0 if expired/invalid
 */
export const getTokenRemainingTime = (): number => {
  try {
    const storedTimestamp = localStorage.getItem('auth_timestamp');
    
    if (!storedTimestamp) {
      return 0;
    }
    
    const timestamp = parseInt(storedTimestamp, 10);
    const now = Date.now();
    const tokenAge = now - timestamp;
    const tokenMaxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    return Math.max(0, tokenMaxAge - tokenAge);
  } catch (e) {
    console.error('Error calculating token remaining time:', e);
    return 0;
  }
};
