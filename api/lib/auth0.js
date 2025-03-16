// Auth0 configuration
const AUTH0_DOMAIN = process.env.VITE_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN || 'dev-8jmwfh4hugvdjwh8.au.auth0.com';

console.log('[Auth0][DEBUG] Auth0 module loaded');
console.log('[Auth0][DEBUG] AUTH0_DOMAIN:', AUTH0_DOMAIN);

// User data store - a simple in-memory cache for this example
// In a production environment, you might want to use Redis or another persistent cache
const userDataStore = {};

import mongoose from 'mongoose';

/**
 * A simpler approach to get user information
 * This function tries to get user information from MongoDB first, then falls back to a generated name
 * 
 * @param {string} userId - The Auth0 user ID
 * @returns {Promise<Object|null>} The user information or null if not found
 */
async function fetchUserInfoFromAuth0(userId) {
  try {
    console.log(`[Auth0] Fetching user info for: ${userId}`);
    
    // Check if we have the user in our store
    if (userDataStore[userId]) {
      console.log(`[Auth0] Found user in data store: ${userId}`);
      return userDataStore[userId];
    }
    
    // If not in our store, try to get the user from MongoDB
    console.log(`[Auth0] User not found in data store: ${userId}`);
    
    // Extract the user ID from the Auth0 format (provider|id)
    const parts = userId ? userId.split('|') : [];
    if (parts.length !== 2) {
      // If the userId is not in the expected format, return a fallback
      return {
        id: userId,
        name: `User ${userId ? userId.substring(0, 8) : 'Anonymous'}`,
        provider: "unknown"
      };
    }
    
    const [provider, id] = parts;
    
    // Try to get the user's name from MongoDB first
    try {
      // Try to get the UserData model
      let UserData;
      try {
        UserData = mongoose.model('UserData');
        console.log('[Auth0] Successfully retrieved UserData model');
      } catch (modelError) {
        console.error('[Auth0] Error getting UserData model:', modelError);
        
        // Define the schema if the model doesn't exist
        const UserDataSchema = new mongoose.Schema({
          userId: { type: String, required: true, unique: true, index: true },
          name: String,
          email: String
        });
        
        UserData = mongoose.model('UserData', UserDataSchema);
        console.log('[Auth0] Created UserData model');
      }
      
      // Find the user in MongoDB
      console.log(`[Auth0] Looking up user in MongoDB: ${userId}`);
      const userData = await UserData.findOne({ userId });
      
      if (userData && userData.name) {
        console.log(`[Auth0] Found user in MongoDB: ${userData.name}`);
        return {
          id: userId,
          name: userData.name,
          email: userData.email,
          provider
        };
      } else {
        console.log(`[Auth0] User not found in MongoDB: ${userId}`);
        
        // Try a direct MongoDB query as a fallback
        try {
          console.log(`[Auth0] Trying direct MongoDB query for user: ${userId}`);
          const db = mongoose.connection.db;
          const collection = db.collection('userdatas');
          const result = await collection.findOne({ userId });
          
          if (result && result.name) {
            console.log(`[Auth0] Found user with direct query: ${result.name}`);
            return {
              id: userId,
              name: result.name,
              email: result.email,
              provider
            };
          }
        } catch (directError) {
          console.error(`[Auth0] Error in direct MongoDB query:`, directError);
        }
      }
    } catch (error) {
      console.error(`[Auth0] Error getting user from MongoDB: ${error.message}`);
    }
    
    // If we couldn't get the user from MongoDB, create a name based on the provider
    if (provider === 'google-oauth2') {
      return {
        id: userId,
        name: `Google User (${id.substring(0, 8)})`,
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
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User (${id.substring(0, 8)})`,
        provider
      };
    }
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
    
    // Try to get user info from our simpler approach
    const userInfo = await fetchUserInfoFromAuth0(userId);
    
    if (userInfo) {
      console.log(`[Auth0] User found:`, userInfo);
      return userInfo;
    }
    
    // If we couldn't get the user info, use a fallback
    console.warn(`[Auth0] User not found: ${userId}`);
    const fallbackUser = getFallbackUserInfo(userId);
    console.log(`[Auth0] Using fallback user:`, fallbackUser);
    
    return fallbackUser;
  } catch (error) {
    console.error(`[Auth0] Error getting user info for ${userId}:`, error);
    console.error(`[Auth0] Error details:`, error.stack);
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
  // For users, try to extract a more user-friendly name
  const parts = userId ? userId.split('|') : [];
  if (parts.length === 2) {
    const [provider, id] = parts;
    
    // Format based on the authentication provider
    if (provider === 'google-oauth2') {
      return {
        id: userId,
        name: `Google User (${id.substring(0, 8)})`,
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
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User (${id.substring(0, 8)})`,
        provider
      };
    }
  }
  
  // Default fallback with unique ID
  return {
    id: userId,
    name: `User ${userId ? userId.substring(0, 8) : 'Anonymous'}`,
    provider: "unknown"
  };
}
