/**
 * User Service
 * Handles user data operations like fetching and updating user profiles
 */

/**
 * Fetch user data from the API
 * @param {string} userId - The Auth0 user ID
 * @returns {Promise<Object>} - The user data
 */
export const fetchUserData = async (userId) => {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }
    
    const response = await fetch(`/api/user?userId=${encodeURIComponent(userId)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

/**
 * Update user data in the API
 * @param {Object} userData - The user data to update
 * @param {string} userData.userId - The Auth0 user ID
 * @param {string} [userData.name] - The user's name
 * @param {string} [userData.email] - The user's email
 * @param {string} [userData.website] - The user's website
 * @returns {Promise<Object>} - The updated user data
 */
export const updateUserData = async (userData) => {
  try {
    console.log('[DEBUG] userService.updateUserData called with:', userData);
    
    if (!userData || !userData.userId) {
      console.error('[DEBUG] Missing userData or userId');
      throw new Error('userData with userId is required');
    }
    
    console.log('[DEBUG] Preparing to send POST request to /api/user');
    console.log('[DEBUG] Request payload:', JSON.stringify(userData, null, 2));
    
    const response = await fetch('/api/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    console.log('[DEBUG] Response status:', response.status, response.statusText);
    console.log('[DEBUG] Response headers:', Object.fromEntries([...response.headers]));
    
    if (!response.ok) {
      console.error('[DEBUG] Response not OK:', response.status, response.statusText);
      throw new Error(`Failed to update user data: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('[DEBUG] Response data:', responseData);
    
    return responseData;
  } catch (error) {
    console.error('[DEBUG] Error in updateUserData:', error);
    console.error('[DEBUG] Error stack:', error.stack);
    throw error;
  }
};

/**
 * Create a user context hook to provide user data throughout the app
 * This could be expanded in the future to include more user-related functionality
 */
export const createUserContext = () => {
  // This is a placeholder for future implementation
  // Could include React context for user data, preferences, etc.
  console.log('User context creation is a placeholder for future implementation');
};

export default {
  fetchUserData,
  updateUserData,
  createUserContext
};
