/**
 * Auth Callback Service
 * Handles user data initialization after login
 */

/**
 * Check if user exists in MongoDB and create if not
 * @param {string} userId - The Auth0 user ID
 * @param {Object} userData - Basic user data from Auth0
 * @returns {Promise<Object>} - The user data or a fallback object if there's an error
 */
export const initializeUserData = async (userId, userData) => {
  try {
    console.log('[AUTH_CALLBACK] Initializing user data check for:', userId);
    console.log('[AUTH_CALLBACK] User data from Auth0:', userData);
    
    if (!userId) {
      console.error('[AUTH_CALLBACK] Error: userId is required');
      // Return a fallback object instead of throwing
      return createFallbackUserData(userId, userData);
    }
    
    // First, try to fetch the user data to see if it exists
    console.log('[AUTH_CALLBACK] Checking if user exists in MongoDB...');
    let existingUserData = null;
    
    try {
      const response = await fetch(`/api/user?userId=${encodeURIComponent(userId)}`);
      
      if (response.ok) {
        existingUserData = await response.json();
        console.log('[AUTH_CALLBACK] User exists in MongoDB:', existingUserData);
        return existingUserData;
      } else {
        console.log('[AUTH_CALLBACK] User not found in MongoDB or error occurred. Status:', response.status);
        // If we get a 500 error, it might be a temporary issue with the database
        // Let's store the user data in localStorage as a fallback
        if (response.status === 500) {
          console.log('[AUTH_CALLBACK] Server error detected, using localStorage fallback');
          return storeUserDataInLocalStorage(userId, userData);
        }
      }
    } catch (fetchError) {
      console.error('[AUTH_CALLBACK] Error checking if user exists:', fetchError);
      // Use localStorage fallback
      return storeUserDataInLocalStorage(userId, userData);
    }
    
    // If we get here, either the user doesn't exist or there was an error fetching
    // Let's try to create the user
    console.log('[AUTH_CALLBACK] Creating new user in MongoDB...');
    
    const createUserPayload = {
      userId: userId,
      name: userData?.name || '',
      email: userData?.email || '',
      website: ''
    };
    
    console.log('[AUTH_CALLBACK] User creation payload:', createUserPayload);
    
    try {
      const createResponse = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createUserPayload)
      });
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[AUTH_CALLBACK] Failed to create user:', createResponse.status, errorText);
        // Use localStorage fallback
        return storeUserDataInLocalStorage(userId, userData);
      }
      
      const newUserData = await createResponse.json();
      console.log('[AUTH_CALLBACK] User created successfully:', newUserData);
      return newUserData;
    } catch (createError) {
      console.error('[AUTH_CALLBACK] Error creating user:', createError);
      // Use localStorage fallback
      return storeUserDataInLocalStorage(userId, userData);
    }
    
  } catch (error) {
    console.error('[AUTH_CALLBACK] Error initializing user data:', error);
    // Return a fallback object instead of throwing
    return createFallbackUserData(userId, userData);
  }
};

/**
 * Store user data in localStorage as a fallback when MongoDB is unavailable
 * @param {string} userId - The Auth0 user ID
 * @param {Object} userData - Basic user data from Auth0
 * @returns {Object} - The fallback user data object
 */
const storeUserDataInLocalStorage = (userId, userData) => {
  try {
    console.log('[AUTH_CALLBACK] Storing user data in localStorage as fallback');
    
    const fallbackUserData = createFallbackUserData(userId, userData);
    
    // Store in localStorage
    localStorage.setItem('fallbackUserData', JSON.stringify(fallbackUserData));
    console.log('[AUTH_CALLBACK] User data stored in localStorage');
    
    return fallbackUserData;
  } catch (error) {
    console.error('[AUTH_CALLBACK] Error storing in localStorage:', error);
    return createFallbackUserData(userId, userData);
  }
};

/**
 * Create a fallback user data object when MongoDB is unavailable
 * @param {string} userId - The Auth0 user ID
 * @param {Object} userData - Basic user data from Auth0
 * @returns {Object} - The fallback user data object
 */
const createFallbackUserData = (userId, userData) => {
  console.log('[AUTH_CALLBACK] Creating fallback user data object');
  
  return {
    userId: userId || 'unknown',
    name: userData?.name || 'User',
    email: userData?.email || '',
    website: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _isFallback: true
  };
};

/**
 * Get user data from localStorage if MongoDB is unavailable
 * @param {string} userId - The Auth0 user ID
 * @returns {Object|null} - The user data from localStorage or null if not found
 */
export const getFallbackUserData = (userId) => {
  try {
    const fallbackData = localStorage.getItem('fallbackUserData');
    if (fallbackData) {
      const parsedData = JSON.parse(fallbackData);
      if (parsedData.userId === userId) {
        console.log('[AUTH_CALLBACK] Found fallback user data in localStorage');
        return parsedData;
      }
    }
    return null;
  } catch (error) {
    console.error('[AUTH_CALLBACK] Error getting fallback user data:', error);
    return null;
  }
};

export default {
  initializeUserData,
  getFallbackUserData
};
