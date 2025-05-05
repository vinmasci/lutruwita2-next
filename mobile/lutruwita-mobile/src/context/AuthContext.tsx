import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth0, Auth0Provider, Credentials, User } from 'react-native-auth0';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { signInWithAuth0User, signOutFromFirebase } from '../services/firebaseAuthService';

// Get Auth0 credentials from environment variables via app.config.js
const AUTH0_DOMAIN = Constants.expoConfig?.extra?.EXPO_PUBLIC_AUTH0_DOMAIN || '';
const AUTH0_CLIENT_ID = Constants.expoConfig?.extra?.EXPO_PUBLIC_AUTH0_CLIENT_ID || '';
const AUTH0_AUDIENCE = Constants.expoConfig?.extra?.EXPO_PUBLIC_AUTH0_AUDIENCE || '';

// Log the credentials for debugging only in development mode
if (__DEV__) {
  console.log('Auth0 Configuration:', {
    domain: AUTH0_DOMAIN,
    clientId: '***********', // Masked for security
    audience: AUTH0_AUDIENCE
  });
}

// Storage keys
const CREDENTIALS_KEY = 'auth0Credentials';
const USER_KEY = 'auth0User';

  // Types
type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

// Define a more flexible type for credentials
type StoredCredentials = {
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresIn?: number;
  expiresAt: number;
};

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Internal Auth Provider that uses the useAuth0 hook
const InternalAuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { authorize, clearSession, user: auth0User, getCredentials, isLoading: auth0Loading } = useAuth0();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<StoredCredentials | null>(null);

  // Check if user is already authenticated on app start
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // First check if Auth0 already has the user authenticated
        if (auth0User) {
          setUser(auth0User);
          setIsAuthenticated(true);
          
          // Get credentials from Auth0
          const creds = await getCredentials();
          if (creds) {
            const expiresAt = Date.now() + (creds.expiresIn || 86400) * 1000;
            const storedCredentials: StoredCredentials = {
              ...creds,
              expiresAt
            };
            setCredentials(storedCredentials);
            await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(storedCredentials));
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(auth0User));
            
            // Sign in to Firebase with Auth0 user
            await signInWithAuth0User(auth0User, (creds as Credentials).accessToken || null);
          }
        } else {
          // If not, check local storage
          const storedCredentials = await AsyncStorage.getItem(CREDENTIALS_KEY);
          const storedUser = await AsyncStorage.getItem(USER_KEY);
          
          if (storedCredentials && storedUser) {
            const parsedCredentials: StoredCredentials = JSON.parse(storedCredentials);
            const parsedUser: User = JSON.parse(storedUser);
            
            setCredentials(parsedCredentials);
            setUser(parsedUser);
            
            // Check if token is expired
            if (parsedCredentials.expiresAt > Date.now()) {
              // Token still valid
              setIsAuthenticated(true);
            } else {
              // Token expired, require re-login
              setIsAuthenticated(false);
              await AsyncStorage.removeItem(CREDENTIALS_KEY);
              await AsyncStorage.removeItem(USER_KEY);
            }
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!auth0Loading) {
      checkAuthState();
    }
  }, [auth0User, auth0Loading, getCredentials]);

  // Login function
  const login = async () => {
    try {
      setIsLoading(true);
      
      // Authorize with Auth0
      // Use the bundle identifier for the callback URL
      const bundleId = Constants.expoConfig?.ios?.bundleIdentifier || 'com.lutruwita.mobile';
      const packageName = Constants.expoConfig?.android?.package || 'com.lutruwita.mobile';
      
      // The callback URL will be handled automatically by the Auth0 SDK
      const credentials = await authorize({
        scope: 'openid profile email offline_access',
        audience: AUTH0_AUDIENCE
      }) || { expiresIn: 86400 }; // Provide default in case credentials are undefined
      
      // Calculate expiry time
      const expiresAt = Date.now() + (credentials.expiresIn || 86400) * 1000;
      
      // Store credentials
      const storedCredentials: StoredCredentials = {
        ...credentials,
        expiresAt
      };
      
      await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(storedCredentials));
      setCredentials(storedCredentials);
      
      // User info should be available from auth0User after successful login
      if (auth0User) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(auth0User));
        setUser(auth0User);
        
        // Sign in to Firebase with Auth0 user
        await signInWithAuth0User(auth0User, (credentials as Credentials).accessToken || null);
      }
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear session with Auth0
      await clearSession();
      
      // Sign out from Firebase
      await signOutFromFirebase();
      
      // Clear stored credentials
      await AsyncStorage.removeItem(CREDENTIALS_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      
      // Update state
      setIsAuthenticated(false);
      setUser(null);
      setCredentials(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get access token function
  const getAccessToken = async (): Promise<string | null> => {
    try {
      if (!credentials) return null;
      
      // Check if token is expired or will expire soon (5 min buffer)
      if (credentials.expiresAt <= Date.now() + 300000) {
        // Token expired or expiring soon, try to get new credentials
        const newCredentials = await getCredentials();
        if (newCredentials && newCredentials.accessToken) {
          // Calculate expiry time
          const expiresAt = Date.now() + (newCredentials.expiresIn || 86400) * 1000;
          
          // Store the new credentials
          const storedCredentials: StoredCredentials = {
            ...newCredentials,
            expiresAt
          };
          
          await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(storedCredentials));
          setCredentials(storedCredentials);
          
          return newCredentials.accessToken || null;
        }
        return null;
      }
      
      return credentials.accessToken || null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading: isLoading || auth0Loading,
      user,
      login,
      logout,
      getAccessToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Main Auth Provider that wraps the Auth0Provider
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <Auth0Provider domain={AUTH0_DOMAIN} clientId={AUTH0_CLIENT_ID}>
      <InternalAuthProvider>
        {children}
      </InternalAuthProvider>
    </Auth0Provider>
  );
};

// Hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
