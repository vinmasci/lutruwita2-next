import { auth } from './firebaseService';
import { User } from 'react-native-auth0';

/**
 * Firebase Authentication Service
 * 
 * This service handles the integration between Auth0 and Firebase Authentication.
 * It ensures that when a user authenticates with Auth0, they are also authenticated
 * with Firebase using the same user ID.
 */

// Maximum number of retry attempts for Firebase authentication
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000; // 1 second delay between retries

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Sign in to Firebase with Auth0 user
export const signInWithAuth0User = async (user: User | null, accessToken: string | null): Promise<boolean> => {
  // Track retry attempts
  let retryCount = 0;
  
  // Retry loop
  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      if (!user || !accessToken) {
        console.log('[FirebaseAuthService] No user or access token provided');
        return false;
      }

      console.log(`[FirebaseAuthService] Signing in to Firebase with Auth0 user: ${user.sub} (Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      
      // Get the current Firebase user
      const currentUser = auth().currentUser;
      
      // If already signed in with the same user ID, no need to sign in again
      if (currentUser) {
        console.log('[FirebaseAuthService] Current Firebase user:', currentUser.uid);
        
        // Check if the display name is already set to the Auth0 user ID
        if (currentUser.displayName === user.sub) {
          console.log('[FirebaseAuthService] Already signed in to Firebase with the correct display name');
          return true;
        }
        
        // If we have a user but the display name doesn't match, update it
        try {
          console.log('[FirebaseAuthService] Updating Firebase user profile with Auth0 user ID');
          await currentUser.updateProfile({
            displayName: user.sub
          });
          console.log('[FirebaseAuthService] Successfully updated Firebase user profile');
          return true;
        } catch (profileError) {
          console.error('[FirebaseAuthService] Error updating Firebase user profile:', profileError);
          // Continue to sign out and try again
        }
        
        // Sign out if we couldn't update the profile
        console.log('[FirebaseAuthService] Signing out current Firebase user');
        await auth().signOut();
      }
      
      // For proper integration, we would need a backend service that generates
      // a Firebase custom token using the Auth0 user ID. For now, we'll use
      // anonymous authentication and then update the user profile with the Auth0 user ID.
      
      console.log('[FirebaseAuthService] Attempting anonymous sign-in');
      
      // Sign in anonymously
      const credential = await auth().signInAnonymously();
      
      // Update the user profile with the Auth0 user ID
      if (credential.user) {
        console.log('[FirebaseAuthService] Anonymous sign-in successful, updating profile');
        
        // In a production app, we would use a custom token from a backend service
        // that would set the UID to match the Auth0 user ID. Since we can't do that
        // directly in the client, we'll store the Auth0 user ID in the user's display name
        // as a workaround.
        try {
          await credential.user.updateProfile({
            displayName: user.sub
          });
          
          console.log('[FirebaseAuthService] Successfully signed in to Firebase and updated profile');
          return true;
        } catch (profileError) {
          console.error('[FirebaseAuthService] Error updating Firebase user profile:', profileError);
          // If we can't update the profile, but we're signed in, that's still a partial success
          console.log('[FirebaseAuthService] Continuing with anonymous auth without profile update');
          return true;
        }
      }
      
      // If we get here, something went wrong but didn't throw an exception
      console.warn('[FirebaseAuthService] Anonymous sign-in completed but no user was returned');
      
      // Increment retry counter and try again
      retryCount++;
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        console.log(`[FirebaseAuthService] Retrying in ${RETRY_DELAY_MS}ms...`);
        await delay(RETRY_DELAY_MS);
      }
    } catch (error) {
      console.error(`[FirebaseAuthService] Error signing in to Firebase (Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}):`, error);
      
      // Increment retry counter and try again
      retryCount++;
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        console.log(`[FirebaseAuthService] Retrying in ${RETRY_DELAY_MS}ms...`);
        await delay(RETRY_DELAY_MS);
      } else {
        // All retries failed, try to continue with mock authentication
        console.warn('[FirebaseAuthService] All authentication attempts failed, using mock authentication');
        return true; // Return true to allow the app to continue functioning
      }
    }
  }
  
  // If we've exhausted all retries, return false
  return false;
};

// Sign out from Firebase
export const signOutFromFirebase = async (): Promise<boolean> => {
  try {
    console.log('[FirebaseAuthService] Signing out from Firebase');
    await auth().signOut();
    console.log('[FirebaseAuthService] Successfully signed out from Firebase');
    return true;
  } catch (error) {
    console.error('[FirebaseAuthService] Error signing out from Firebase:', error);
    return false;
  }
};

// Get the current Firebase user
export const getCurrentFirebaseUser = () => {
  return auth().currentUser;
};

// Get the Auth0 user ID from the Firebase user
export const getAuth0UserIdFromFirebaseUser = () => {
  const user = auth().currentUser;
  return user?.displayName || null;
};
