/**
 * Firebase Service
 * 
 * This service initializes the Firebase app and provides access to Firebase services.
 * It handles authentication and database connections.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyDMPCfqbTIiT3vFE1QZRZXkUuX1Nc85XxI",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "cyatrails.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "cyatrails",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "cyatrails.appspot.com",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "79924943942",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:79924943942:web:5a4e7a9bf38fe5f4e9c5a0",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
};

// Initialize Firebase
let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('[FirebaseService] Firebase initialized successfully');
} catch (error) {
  console.error('[FirebaseService] Error initializing Firebase:', error);
}

export { app, db, auth };

/**
 * Check if Firebase is properly configured
 * @returns {boolean} True if Firebase is configured, false otherwise
 */
export const isFirebaseConfigured = () => {
  return !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
};

export default {
  app,
  db,
  auth,
  isFirebaseConfigured
};
