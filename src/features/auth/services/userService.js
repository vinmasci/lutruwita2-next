/**
 * User Service
 * Handles user data operations like fetching and updating user profiles
 * Now uses Firebase instead of MongoDB API
 */

import { 
  fetchUserData as firebaseFetchUserData,
  updateUserData as firebaseUpdateUserData,
  updateUserLogin,
  ensureUserProfileFields
} from '../../../services/firebaseUserService.js';

/**
 * Fetch user data from Firebase
 * @param {string} userId - The Auth0 user ID
 * @returns {Promise<Object>} - The user data
 */
export const fetchUserData = async (userId) => {
  try {
    console.log('[UserService] Fetching user data via Firebase for:', userId);
    return await firebaseFetchUserData(userId);
  } catch (error) {
    console.error('[UserService] Error fetching user data:', error);
    throw error;
  }
};

/**
 * Update user data in Firebase
 * @param {Object} userData - The user data to update
 * @param {string} userData.userId - The Auth0 user ID
 * @param {string} [userData.name] - The user's name
 * @param {string} [userData.email] - The user's email
 * @param {string} [userData.website] - The user's website
 * @returns {Promise<Object>} - The updated user data
 */
export const updateUserData = async (userData) => {
  try {
    console.log('[UserService] Updating user data via Firebase:', userData);
    return await firebaseUpdateUserData(userData);
  } catch (error) {
    console.error('[UserService] Error updating user data:', error);
    throw error;
  }
};

/**
 * Update user login information
 * @param {string} userId - The Auth0 user ID
 */
export const updateUserLoginInfo = async (userId) => {
  try {
    console.log('[UserService] Updating user login info:', userId);
    return await updateUserLogin(userId);
  } catch (error) {
    console.error('[UserService] Error updating login info:', error);
    throw error;
  }
};

/**
 * Ensure user profile has all required fields (migration helper)
 * @param {string} userId - The Auth0 user ID
 * @param {Object} auth0UserData - Auth0 user information
 */
export const ensureProfileFields = async (userId, auth0UserData = {}) => {
  try {
    console.log('[UserService] Ensuring profile fields for:', userId);
    return await ensureUserProfileFields(userId, auth0UserData);
  } catch (error) {
    console.error('[UserService] Error ensuring profile fields:', error);
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
  updateUserLoginInfo,
  ensureProfileFields,
  createUserContext
};
