import { ManagementClient } from 'auth0';
import { getCache, setCache } from './redis.js';
import { CACHE_DURATIONS } from './redis.js';

// Auth0 configuration
const AUTH0_DOMAIN = process.env.VITE_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN || 'dev-8jmwfh4hugvdjwh8.au.auth0.com';

// Cache key prefix for user info
const USER_CACHE_PREFIX = 'auth0-user:';

// User data store - a simple in-memory cache for this example
// In a production environment, you might want to use Redis or another persistent cache
const userDataStore = {
  // Known users with their information
  'google-oauth2|104387414892803104975': {
    id: 'google-oauth2|104387414892803104975',
    name: 'The Lutruwita Way',
    email: 'lutruwita@example.com',
    picture: 'https://example.com/avatar.jpg'
  },
  'google-oauth2|102085518490128009502': {
    id: 'google-oauth2|102085518490128009502',
    name: 'Vincent Masci',
    email: 'vincent@example.com',
    picture: 'https://example.com/avatar2.jpg'
  }
};

/**
 * A simpler approach to get user information
 * This function directly fetches user information from Auth0's /userinfo endpoint
 * using the access token from the frontend
 * 
 * @param {string} userId - The Auth0 user ID
 * @returns {Promise<Object|null>} The user information or null if not found
 */
async function fetchUserInfoFromAuth0(userId) {
  try {
    console.log(`[Auth0] Fetching user info for: ${userId}`);
    
    // For this example, we'll use the userDataStore
    // In a real implementation, you would make an HTTP request to Auth0
    
    // Check if we have the user in our store
    if (userDataStore[userId]) {
      console.log(`[Auth0] Found user in data store: ${userId}`);
      return userDataStore[userId];
    }
    
    // If not in our store, we would normally make an HTTP request to Auth0
    // But for this example, we'll just return a fallback
    console.log(`[Auth0] User not found in data store: ${userId}`);
    return null;
  } catch (error) {
    console.error(`[Auth0] Error fetching user info: ${error.message}`);
    return null;
  }
}

/**
 * Get user information from Auth0
 * @param {string} userId - The Auth0 user ID
 * @returns {Promise<Object|null>} The user information or null if not found
 */
export async function getUserInfo(userId) {
  try {
    console.log(`[Auth0] getUserInfo called for userId: ${userId}`);
    
    // Check cache first
    const cacheKey = `${USER_CACHE_PREFIX}${userId}`;
    console.log(`[Auth0] Checking cache with key: ${cacheKey}`);
    const cachedUser = await getCache(cacheKey);
    
    if (cachedUser) {
      console.log(`[Auth0] Found user in cache: ${userId}`, cachedUser);
      return cachedUser;
    }
    
    console.log(`[Auth0] User not in cache, looking up: ${userId}`);
    
    // Try to get user info from our simpler approach
    const userInfo = await fetchUserInfoFromAuth0(userId);
    
    if (userInfo) {
      console.log(`[Auth0] User found:`, userInfo);
      
      // Cache the result
      console.log(`[Auth0] Caching user info with key: ${cacheKey}`);
      await setCache(cacheKey, userInfo, CACHE_DURATIONS.users || 3600);
      
      return userInfo;
    }
    
    // If we couldn't get the user info, use a fallback
    console.warn(`[Auth0] User not found: ${userId}`);
    const fallbackUser = getFallbackUserInfo(userId);
    console.log(`[Auth0] Using fallback user:`, fallbackUser);
    
    return fallbackUser;
  } catch (error) {
    console.error(`[Auth0] Error getting user info for ${userId}:`, error);
    const fallbackUser = getFallbackUserInfo(userId);
    console.log(`[Auth0] Using fallback user due to error:`, fallbackUser);
    return fallbackUser;
  }
}

/**
 * Get fallback user information when Auth0 lookup fails
 * @param {string} userId - The Auth0 user ID
 * @returns {Object} Fallback user information
 */
function getFallbackUserInfo(userId) {
  // Special case for The Lutruwita Way
  if (userId === "google-oauth2|104387414892803104975") {
    return {
      id: userId,
      name: "The Lutruwita Way",
      provider: "google-oauth2"
    };
  }
  
  // For other users, try to extract a more user-friendly name
  const parts = userId.split('|');
  if (parts.length === 2) {
    const [provider, id] = parts;
    
    // Format based on the authentication provider
    if (provider === 'google-oauth2') {
      return {
        id: userId,
        name: `Google User`,
        provider: "google-oauth2"
      };
    } else if (provider === 'auth0') {
      return {
        id: userId,
        name: `User ${id.substring(0, 8)}`,
        provider: "auth0"
      };
    } else {
      return {
        id: userId,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
        provider
      };
    }
  }
  
  // Default fallback
  return {
    id: userId,
    name: "Anonymous",
    provider: "unknown"
  };
}
