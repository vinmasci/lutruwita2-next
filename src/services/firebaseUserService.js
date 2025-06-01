/**
 * Firebase User Service
 * Handles user data operations using Firebase instead of MongoDB
 * Replaces the functionality from api/user/index.js
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseService';

/**
 * Fetch user data from Firebase
 * @param {string} userId - The Auth0 user ID
 * @returns {Promise<Object>} - The user data
 */
export const fetchUserData = async (userId) => {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }
    
    console.log(`[FirebaseUserService] Fetching user data for: ${userId}`);
    
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log(`[FirebaseUserService] User data found in Firebase`);
      
      // Return the profile data in the expected format
      return {
        userId,
        name: userData.profile?.name || '',
        email: userData.profile?.email || '',
        website: userData.profile?.website || '',
        picture: userData.profile?.picture || '',
        nickname: userData.profile?.nickname || '',
        lastLogin: userData.profile?.lastLogin || null,
        platform: userData.profile?.platform || 'web',
        createdAt: userData.profile?.createdAt || null,
        updatedAt: userData.profile?.updatedAt || null,
        _source: 'firebase'
      };
    } else {
      console.log(`[FirebaseUserService] User data not found in Firebase: ${userId}`);
      
      // User doesn't exist in Firebase, create a basic profile
      const newUserData = {
        profile: {
          name: `User ${userId.substring(userId.lastIndexOf('|') + 1, userId.lastIndexOf('|') + 9)}`,
          email: '',
          website: '',
          picture: '',
          nickname: '',
          lastLogin: serverTimestamp(),
          platform: 'web',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      };
      
      // Create the user document
      await setDoc(userDocRef, newUserData, { merge: true });
      console.log(`[FirebaseUserService] Created new user profile in Firebase: ${userId}`);
      
      return {
        userId,
        name: newUserData.profile.name,
        email: newUserData.profile.email,
        website: newUserData.profile.website,
        picture: newUserData.profile.picture,
        nickname: newUserData.profile.nickname,
        lastLogin: new Date(),
        platform: 'web',
        createdAt: new Date(),
        updatedAt: new Date(),
        _created: true,
        _source: 'firebase'
      };
    }
  } catch (error) {
    console.error(`[FirebaseUserService] Error fetching user data:`, error);
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
 * @param {string} [userData.picture] - The user's picture URL
 * @param {string} [userData.username] - The user's username (maps to nickname in Firebase)
 * @returns {Promise<Object>} - The updated user data
 */
export const updateUserData = async (userData) => {
  try {
    console.log(`[FirebaseUserService] Updating user data for: ${userData.userId}`);
    
    if (!userData || !userData.userId) {
      throw new Error('userData with userId is required');
    }
    
    const { userId, name, email, website, picture, nickname, username } = userData;
    const userDocRef = doc(db, 'users', userId);
    
    // Check if user exists first
    const userDoc = await getDoc(userDocRef);
    
    // Prepare the update data
    const profileUpdates = {
      updatedAt: serverTimestamp(),
      platform: 'web'
    };
    
    // Only update fields that are provided
    if (name !== undefined) profileUpdates.name = name;
    if (email !== undefined) profileUpdates.email = email;
    if (website !== undefined) profileUpdates.website = website;
    if (picture !== undefined) profileUpdates.picture = picture;
    if (nickname !== undefined) profileUpdates.nickname = nickname;
    // Map username field to nickname in Firebase
    if (username !== undefined) profileUpdates.nickname = username;
    
    if (userDoc.exists()) {
      // Update existing user
      console.log(`[FirebaseUserService] Updating existing user profile`);
      
      // Build update object with only defined fields
      const updateFields = {
        'profile.updatedAt': profileUpdates.updatedAt,
        'profile.platform': profileUpdates.platform
      };
      
      // Only add fields that are defined (not undefined)
      if (profileUpdates.name !== undefined) updateFields['profile.name'] = profileUpdates.name;
      if (profileUpdates.email !== undefined) updateFields['profile.email'] = profileUpdates.email;
      if (profileUpdates.website !== undefined) updateFields['profile.website'] = profileUpdates.website;
      if (profileUpdates.picture !== undefined) updateFields['profile.picture'] = profileUpdates.picture;
      if (profileUpdates.nickname !== undefined) updateFields['profile.nickname'] = profileUpdates.nickname;
      
      await updateDoc(userDocRef, updateFields);
    } else {
      // Create new user
      console.log(`[FirebaseUserService] Creating new user profile`);
      profileUpdates.createdAt = serverTimestamp();
      profileUpdates.lastLogin = serverTimestamp();
      
      await setDoc(userDocRef, {
        profile: profileUpdates
      }, { merge: true });
    }
    
    console.log(`[FirebaseUserService] User data updated successfully`);
    
    // Return the updated data in the expected format
    return {
      userId,
      name: name || '',
      email: email || '',
      website: website || '',
      picture: picture || '',
      nickname: nickname || '',
      updatedAt: new Date(),
      platform: 'web',
      _source: 'firebase'
    };
  } catch (error) {
    console.error(`[FirebaseUserService] Error updating user data:`, error);
    throw error;
  }
};

/**
 * Update user login information
 * @param {string} userId - The Auth0 user ID
 */
export const updateUserLogin = async (userId) => {
  try {
    if (!userId) {
      throw new Error('userId is required');
    }
    
    console.log(`[FirebaseUserService] Updating login info for: ${userId}`);
    
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const currentData = userDoc.data();
      const currentLoginCount = currentData.profile?.loginCount || 0;
      
      await updateDoc(userDocRef, {
        'profile.lastLogin': serverTimestamp(),
        'profile.loginCount': currentLoginCount + 1,
        'profile.platform': 'web'
      });
      
      console.log(`[FirebaseUserService] Login info updated successfully`);
    } else {
      // If user doesn't exist, create basic profile
      await setDoc(userDocRef, {
        profile: {
          lastLogin: serverTimestamp(),
          loginCount: 1,
          platform: 'web',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      }, { merge: true });
      
      console.log(`[FirebaseUserService] Created basic profile for login tracking`);
    }
  } catch (error) {
    console.error(`[FirebaseUserService] Error updating login info:`, error);
    throw error;
  }
};

/**
 * Ensure user profile has all required fields (migration helper)
 * @param {string} userId - The Auth0 user ID
 * @param {Object} auth0UserData - Auth0 user information
 */
export const ensureUserProfileFields = async (userId, auth0UserData = {}) => {
  try {
    console.log(`[FirebaseUserService] Ensuring profile fields for: ${userId}`);
    
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const currentData = userDoc.data();
      const profile = currentData.profile || {};
      
      // Check if website field exists, if not add it
      if (profile.website === undefined) {
        console.log(`[FirebaseUserService] Adding missing website field`);
        await updateDoc(userDocRef, {
          'profile.website': '',
          'profile.updatedAt': serverTimestamp()
        });
      }
      
      // Ensure other required fields exist
      const requiredFields = {
        name: auth0UserData.name || profile.name || '',
        email: auth0UserData.email || profile.email || '',
        picture: auth0UserData.picture || profile.picture || '',
        nickname: auth0UserData.nickname || profile.nickname || ''
      };
      
      const updates = {};
      let needsUpdate = false;
      
      for (const [field, value] of Object.entries(requiredFields)) {
        if (profile[field] === undefined) {
          updates[`profile.${field}`] = value;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        updates['profile.updatedAt'] = serverTimestamp();
        await updateDoc(userDocRef, updates);
        console.log(`[FirebaseUserService] Added missing profile fields`);
      }
    } else {
      // Create complete profile
      console.log(`[FirebaseUserService] Creating complete user profile`);
      await setDoc(userDocRef, {
        profile: {
          name: auth0UserData.name || '',
          email: auth0UserData.email || '',
          website: '',
          picture: auth0UserData.picture || '',
          nickname: auth0UserData.nickname || '',
          lastLogin: serverTimestamp(),
          loginCount: 1,
          platform: 'web',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      }, { merge: true });
    }
    
    console.log(`[FirebaseUserService] Profile fields ensured for: ${userId}`);
  } catch (error) {
    console.error(`[FirebaseUserService] Error ensuring profile fields:`, error);
    throw error;
  }
};

export default {
  fetchUserData,
  updateUserData,
  updateUserLogin,
  ensureUserProfileFields
};
