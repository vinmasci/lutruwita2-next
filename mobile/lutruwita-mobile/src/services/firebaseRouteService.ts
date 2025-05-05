import { firebase, firestore } from './firebaseService';
import { useAuth } from '../context/AuthContext';
import { getAuth0UserIdFromFirebaseUser } from './firebaseAuthService';

export const useFirebaseRouteService = () => {
  const { user } = useAuth();
  const userId = user?.sub;

  // Get a reference to the user's saved routes collection
  const getSavedRoutesRef = () => {
    // Get the Auth0 user ID from Firebase
    const auth0UserId = getAuth0UserIdFromFirebaseUser();
    
    // Use the Auth0 user ID if available, otherwise fall back to the user.sub from Auth0
    const effectiveUserId = auth0UserId || userId;
    
    if (!effectiveUserId) throw new Error('User not authenticated');
    
    try {
      console.log(`[FirebaseRouteService] Using user ID: ${effectiveUserId}`);
      return firestore().collection('users').doc(effectiveUserId).collection('savedRoutes');
    } catch (error) {
      console.error('[FirebaseRouteService] Error getting saved routes ref:', error);
      // Return a mock collection reference that won't crash the app
      return {
        doc: () => ({
          set: async () => {},
          delete: async () => {},
          get: async () => ({ data: () => undefined, exists: false })
        }),
        get: async () => ({ docs: [] })
      };
    }
  };

  // List all saved routes for the current user
  const listSavedRoutes = async (): Promise<string[]> => {
    try {
      const auth0UserId = getAuth0UserIdFromFirebaseUser();
      const effectiveUserId = auth0UserId || userId;
      console.log(`[FirebaseRouteService] Listing saved routes for user: ${effectiveUserId}`);
      const snapshot = await getSavedRoutesRef().get();
      const routeIds = snapshot.docs.map((doc: any) => doc.id);
      console.log(`[FirebaseRouteService] Found ${routeIds.length} saved routes`);
      return routeIds;
    } catch (error) {
      console.error('[FirebaseRouteService] Error listing saved routes:', error);
      return []; // Return empty array instead of throwing
    }
  };

  // Save a route for the current user
  const saveRoute = async (routeId: string): Promise<boolean> => {
    try {
      const auth0UserId = getAuth0UserIdFromFirebaseUser();
      const effectiveUserId = auth0UserId || userId;
      console.log(`[FirebaseRouteService] Saving route ${routeId} for user: ${effectiveUserId}`);
      await getSavedRoutesRef().doc(routeId).set({
        savedAt: firestore.FieldValue?.serverTimestamp?.() || new Date(),
        routeId
      });
      console.log(`[FirebaseRouteService] Successfully saved route ${routeId}`);
      return true;
    } catch (error) {
      console.error(`[FirebaseRouteService] Error saving route ${routeId}:`, error);
      return false; // Return false instead of throwing
    }
  };

  // Remove a saved route for the current user
  const removeRoute = async (routeId: string): Promise<boolean> => {
    try {
      const auth0UserId = getAuth0UserIdFromFirebaseUser();
      const effectiveUserId = auth0UserId || userId;
      console.log(`[FirebaseRouteService] Removing route ${routeId} for user: ${effectiveUserId}`);
      await getSavedRoutesRef().doc(routeId).delete();
      console.log(`[FirebaseRouteService] Successfully removed route ${routeId}`);
      return true;
    } catch (error) {
      console.error(`[FirebaseRouteService] Error removing route ${routeId}:`, error);
      return false; // Return false instead of throwing
    }
  };

  // Check if a route is saved
  const isRouteSaved = async (routeId: string): Promise<boolean> => {
    try {
      console.log(`[FirebaseRouteService] Checking if route ${routeId} is saved`);
      const docSnapshot = await getSavedRoutesRef().doc(routeId).get();
      
      // Check if document exists
      const exists = docSnapshot.exists !== undefined ? docSnapshot.exists : false;
      
      console.log(`[FirebaseRouteService] Route ${routeId} is ${exists ? 'saved' : 'not saved'}`);
      return exists;
    } catch (error) {
      console.error(`[FirebaseRouteService] Error checking if route ${routeId} is saved:`, error);
      return false;
    }
  };

  return {
    listSavedRoutes,
    saveRoute,
    removeRoute,
    isRouteSaved
  };
};
