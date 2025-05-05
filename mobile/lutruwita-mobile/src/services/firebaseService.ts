import { Platform, NativeModules } from 'react-native';

// Create mock implementations for when Firebase fails to initialize
const createMockFirebase = () => {
  console.warn('[Firebase] Using mock Firebase implementation');
  return {
    app: () => ({
      name: 'mock-app'
    })
  };
};

const createMockFirestore = () => {
  console.warn('[Firebase] Using mock Firestore implementation');
  const firestoreFunction = () => ({
    collection: (path: string) => ({
      doc: (id: string) => ({
        collection: (subPath: string) => ({
          get: async () => ({ docs: [] }),
          doc: (subId: string) => ({
            set: async () => {},
            delete: async () => {},
            get: async () => ({ data: () => undefined, exists: false })
          })
        }),
        get: async () => ({ data: () => undefined, exists: false }),
        set: async () => {},
        delete: async () => {}
      }),
      get: async () => ({ docs: [] })
    })
  });
  
  // Add FieldValue property
  (firestoreFunction as any).FieldValue = {
    serverTimestamp: () => new Date()
  };
  
  return firestoreFunction;
};

const createMockAuth = () => {
  console.warn('[Firebase] Using mock Auth implementation');
  return () => ({
    onAuthStateChanged: () => () => {},
    signInWithCustomToken: async () => {},
    signInAnonymously: async () => ({
      user: {
        uid: 'mock-user-id',
        displayName: null,
        updateProfile: async (profile: any) => {
          console.log('[Firebase Mock] Updating profile:', profile);
          return Promise.resolve();
        }
      }
    }),
    signOut: async () => Promise.resolve(),
    currentUser: {
      uid: 'mock-user-id',
      displayName: null,
      updateProfile: async (profile: any) => {
        console.log('[Firebase Mock] Updating profile:', profile);
        return Promise.resolve();
      }
    }
  });
};

// Try to import Firebase modules, but use mocks if they fail
let firebase: any;
let firestore: any;
let auth: any;

try {
  // Only try to import Firebase if we're on a device
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    console.log('[Firebase] Attempting to initialize Firebase');
    
    // Import Firebase modules - use only React Native Firebase SDK
    const firebaseApp = require('@react-native-firebase/app').default;
    const firestoreModule = require('@react-native-firebase/firestore').default;
    const authModule = require('@react-native-firebase/auth').default;
    
    try {
      // Check if Firebase is already initialized
      let app;
      try {
        // Try to get existing app first
        app = firebaseApp.app();
        console.log('[Firebase] Using existing Firebase app');
      } catch (getAppError) {
        // If no app exists, initialize Firebase
        console.log('[Firebase] No existing Firebase app found, initializing...');
        
        // Initialize Firebase with empty options (will use GoogleService-Info.plist/google-services.json)
        app = firebaseApp.initializeApp({});
        console.log('[Firebase] Firebase app initialized manually');
      }
      
      // Set up Firebase modules
      firebase = firebaseApp;
      firestore = firestoreModule;
      auth = authModule; // This is already a function that returns an auth instance
      
      // Log initialization
      console.log('[Firebase] Firebase initialized successfully');
      console.log('[Firebase] App name:', app.name);
    } catch (appError) {
      console.error('[Firebase] Error with Firebase app:', appError);
      // Fall back to mock implementations
      firebase = createMockFirebase();
      firestore = createMockFirestore();
      auth = createMockAuth();
    }
  } else {
    // Use mocks for web or other platforms
    firebase = createMockFirebase();
    firestore = createMockFirestore();
    auth = createMockAuth();
  }
} catch (error) {
  // If Firebase initialization fails, use mock implementations
  console.error('[Firebase] Failed to initialize Firebase:', error);
  firebase = createMockFirebase();
  firestore = createMockFirestore();
  auth = createMockAuth();
}

export { firebase, firestore, auth };
