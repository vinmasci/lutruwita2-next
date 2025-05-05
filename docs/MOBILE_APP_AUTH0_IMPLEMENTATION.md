# Mobile App Auth0 Implementation Guide

This document provides a comprehensive guide for implementing Auth0 authentication in the Lutruwita mobile app, leveraging the existing Auth0 setup from the web application.

> **Implementation Status**: ✅ Successfully implemented and working with the updated callback URLs and Auth0Provider approach.

## Table of Contents

1. [Auth0 Dashboard Configuration](#auth0-dashboard-configuration)
2. [Mobile App Implementation](#mobile-app-implementation)
3. [Integration with Existing App](#integration-with-existing-app)
4. [Testing and Troubleshooting](#testing-and-troubleshooting)
5. [Advanced Features](#advanced-features)

## Auth0 Dashboard Configuration

### 1. Create a Native Application in Auth0

1. Log in to your Auth0 dashboard at https://manage.auth0.com/
2. Select your tenant (your-auth0-tenant.region.auth0.com)
3. Navigate to "Applications" in the left sidebar
4. Click the "+ Create Application" button
5. Enter a name for your application (e.g., "Lutruwita Mobile App")
6. Select "Native" as the application type
7. Click "Create"

### 2. Configure Application Settings

1. In your new application settings, scroll to the "Application URIs" section
2. Configure the following URIs:

   **Allowed Callback URLs:**
   ```
   https://auth.cyatrails.app/callback,
   com.lutruwita.mobile.auth0://dev-8jmwfh4hugvdjwh8.au.auth0.com/ios/com.lutruwita.mobile/callback,
   com.lutruwita.mobile.auth0://dev-8jmwfh4hugvdjwh8.au.auth0.com/android/com.lutruwita.mobile/callback
   ```

   **Allowed Logout URLs:**
   ```
   https://auth.cyatrails.app,
   com.lutruwita.mobile.auth0://dev-8jmwfh4hugvdjwh8.au.auth0.com/ios/com.lutruwita.mobile/callback,
   com.lutruwita.mobile.auth0://dev-8jmwfh4hugvdjwh8.au.auth0.com/android/com.lutruwita.mobile/callback
   ```

   > **Important Note**: The first URL is a standard HTTP/HTTPS URL that Auth0 requires for validation. The other URLs are the actual callback URLs that will be used by the native mobile app. The React Native Auth0 SDK handles the authentication flow and uses these URLs to return to your app after authentication.

3. For Web Origins and Allowed Origins (CORS), either leave them blank or use the same domain:
   ```
   https://auth.cyatrails.app
   ```

4. Scroll down to "Advanced Settings" and select the "Grant Types" tab
5. Ensure the following grant types are enabled:
   - Authorization Code
   - Refresh Token
   - Implicit

6. Save your changes

### 3. Note Your Credentials

Auth0 has simplified the process for Native apps. Unlike Machine to Machine applications, Native apps do not require explicit API authorization configuration as they use the Authorization Code Flow with PKCE, which is more secure for public clients.

Your application credentials are:

- **Name**: Cya Trails
- **Domain**: `your-auth0-domain.region.auth0.com`
- **Client ID**: `your-auth0-client-id`
- **Client Secret**: `your-auth0-client-secret`
- **API Audience**: `your-auth0-audience`

When implementing the authentication in your mobile app, Auth0 will automatically handle the permissions based on the scopes you request in your authorization call.

## Mobile App Implementation

### 1. Install Required Packages

```bash
cd mobile/lutruwita-mobile
npm install react-native-auth0 @react-native-async-storage/async-storage dotenv
```

### 2. Configure URL Scheme (for Deep Linking)

For Expo-based projects, we can configure the URL scheme in the app.json or app.config.js file:

1. Update `mobile/lutruwita-mobile/app.json` to include the URL scheme:

```json
{
  "expo": {
    "scheme": "cyatrails",
    "ios": {
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleTypeRole": "None",
            "CFBundleURLName": "auth0",
            "CFBundleURLSchemes": [
              "cyatrails"
            ]
          }
        ]
      }
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "category": [
            "DEFAULT",
            "BROWSABLE"
          ],
          "data": {
            "scheme": "cyatrails"
          }
        }
      ]
    }
  }
}
```

2. Create an `app.config.js` file to expose environment variables:

```javascript
import 'dotenv/config';

export default {
  // ... other app config
  extra: {
    EXPO_PUBLIC_AUTH0_DOMAIN: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
    EXPO_PUBLIC_AUTH0_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
    EXPO_PUBLIC_AUTH0_AUDIENCE: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE
  }
};
```

### 3. Create Auth Context

Create a new file at `mobile/lutruwita-mobile/src/context/AuthContext.tsx`:

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import Auth0, { Credentials, User } from 'react-native-auth0';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Auth0 with your credentials
const auth0 = new Auth0({
  domain: 'your-auth0-domain.region.auth0.com',
  clientId: 'your-auth0-client-id'
});

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

type StoredCredentials = Credentials & {
  expiresAt: number;
};

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<StoredCredentials | null>(null);

  // Check if user is already authenticated on app start
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Load credentials from storage
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
            // Token expired, try to refresh
            if (parsedCredentials.refreshToken) {
              await refreshToken(parsedCredentials.refreshToken);
            } else {
              // No refresh token, require re-login
              setIsAuthenticated(false);
            }
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, []);

  // Refresh token function
  const refreshToken = async (refreshToken: string) => {
    try {
      const newCredentials = await auth0.auth.refreshToken({
        refreshToken
      });
      
      // Calculate expiry time
      const expiresAt = Date.now() + (newCredentials.expiresIn || 86400) * 1000;
      
      // Store the new credentials
      const storedCredentials: StoredCredentials = {
        ...newCredentials,
        expiresAt
      };
      
      await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(storedCredentials));
      setCredentials(storedCredentials);
      
      // Get user info with new token
      const userInfo = await auth0.auth.userInfo({ token: newCredentials.accessToken });
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userInfo));
      setUser(userInfo);
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Clear credentials on refresh error
      await AsyncStorage.removeItem(CREDENTIALS_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      setIsAuthenticated(false);
      setUser(null);
      setCredentials(null);
    }
  };

  // Login function
  const login = async () => {
    try {
      setIsLoading(true);
      
      // Authorize with Auth0
      const credentials = await auth0.webAuth.authorize({
        scope: 'openid profile email offline_access',
        audience: 'your-auth0-audience'
      });
      
      // Calculate expiry time
      const expiresAt = Date.now() + (credentials.expiresIn || 86400) * 1000;
      
      // Store credentials
      const storedCredentials: StoredCredentials = {
        ...credentials,
        expiresAt
      };
      
      await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(storedCredentials));
      setCredentials(storedCredentials);
      
      // Get user info
      const userInfo = await auth0.auth.userInfo({ token: credentials.accessToken });
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userInfo));
      setUser(userInfo);
      
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
      await auth0.webAuth.clearSession();
      
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
        // Token expired or expiring soon, try to refresh
        if (credentials.refreshToken) {
          await refreshToken(credentials.refreshToken);
          return credentials?.accessToken || null;
        }
        return null;
      }
      
      return credentials.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      getAccessToken
    }}>
      {children}
    </AuthContext.Provider>
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
```

### 4. Create Auth Screen

Create a new file at `mobile/lutruwita-mobile/src/screens/AuthScreen.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet, Image, SafeAreaView } from 'react-native';
import { Button, Text, Surface, ActivityIndicator, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

const AuthScreen = () => {
  const { login, isLoading } = useAuth();
  const theme = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.authCard}>
        {/* Replace with your app logo */}
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
        
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          Welcome to Lutruwita
        </Text>
        
        <Text style={styles.subtitle}>
          Discover and explore Tasmania's best routes
        </Text>
        
        {isLoading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <>
            <Button 
              mode="contained" 
              style={styles.loginButton}
              onPress={login}
              disabled={isLoading}
            >
              Sign In / Sign Up
            </Button>
            
            <Button 
              mode="outlined" 
              style={styles.guestButton}
              onPress={() => {/* Handle guest mode */}}
              disabled={isLoading}
            >
              Continue as Guest
            </Button>
          </>
        )}
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  authCard: {
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    opacity: 0.7,
  },
  loginButton: {
    width: '100%',
    marginBottom: 16,
    paddingVertical: 8,
  },
  guestButton: {
    width: '100%',
    paddingVertical: 8,
  },
  loader: {
    marginVertical: 24,
  },
});

export default AuthScreen;
```

### 5. Update Navigation to Handle Authentication

Update your navigation setup to handle authentication state:

```tsx
// mobile/lutruwita-mobile/src/navigation/index.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Import screens
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import SavedRoutesScreen from '../screens/SavedRoutesScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigator (when authenticated)
const MainTabNavigator = () => (
  <Tab.Navigator>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Map" component={MapScreen} />
    <Tab.Screen name="Saved" component={SavedRoutesScreen} />
    <Tab.Screen name="Downloads" component={DownloadsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Loading screen
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);

// Root navigator
const Navigation = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth screens
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          // Main app screens
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
```

### 6. Update App.tsx to Include Auth Provider

Update your App.tsx file to include the AuthProvider:

```tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './theme';
import { AuthProvider } from './context/AuthContext';
import { MapProvider } from './context/MapContext';
import { RouteProvider } from './context/RouteContext';
import Navigation from './navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <MapProvider>
            <RouteProvider>
              <Navigation />
            </RouteProvider>
          </MapProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

### 7. Update Profile Screen to Use Auth Context

Update your ProfileScreen.tsx to use the real authentication:

```tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  Text, 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Switch, 
  Divider,
  Avatar,
  List,
  useTheme as usePaperTheme 
} from 'react-native-paper';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = ({ navigation }: any) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const paperTheme = usePaperTheme();
  
  const [settings, setSettings] = React.useState({
    offlineMapQuality: 'standard', // 'low', 'standard', 'high'
    downloadOverCellular: false,
    notifications: true,
  });
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const toggleSetting = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView>
        <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>
          Profile
        </Text>
        
        {isAuthenticated && user ? (
          <Card style={styles.profileSection} elevation={0}>
            <Card.Content style={styles.profileContent}>
              <Avatar.Text 
                size={80} 
                label={user.name ? user.name.charAt(0) : '?'} 
              />
              
              <Title style={styles.userName}>{user.name}</Title>
              <Paragraph style={styles.userEmail}>{user.email}</Paragraph>
              
              {/* Premium badge would be based on user entitlements */}
              <Button 
                mode="outlined" 
                style={styles.upgradeToPremiumButton}
                icon="star"
                onPress={() => console.log('Upgrade to premium')}
              >
                Upgrade to Premium
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.loginPrompt} elevation={0}>
            <Card.Content style={styles.loginPromptContent}>
              <Paragraph style={styles.loginPromptText}>
                Sign in to access your profile, saved maps, and premium content.
              </Paragraph>
            </Card.Content>
          </Card>
        )}
        
        {/* Settings section */}
        <Card style={styles.settingsSection} elevation={0}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Settings</Title>
            <Divider style={styles.divider} />
            
            {/* Map quality settings */}
            <List.Item
              title="Map Quality"
              right={() => (
                <View style={styles.qualitySelector}>
                  <Button 
                    mode={settings.offlineMapQuality === 'low' ? 'contained' : 'outlined'}
                    compact
                    style={styles.qualityOption}
                    onPress={() => setSettings(prev => ({ ...prev, offlineMapQuality: 'low' }))}
                  >
                    Low
                  </Button>
                  <Button 
                    mode={settings.offlineMapQuality === 'standard' ? 'contained' : 'outlined'}
                    compact
                    style={styles.qualityOption}
                    onPress={() => setSettings(prev => ({ ...prev, offlineMapQuality: 'standard' }))}
                  >
                    Standard
                  </Button>
                  <Button 
                    mode={settings.offlineMapQuality === 'high' ? 'contained' : 'outlined'}
                    compact
                    style={styles.qualityOption}
                    onPress={() => setSettings(prev => ({ ...prev, offlineMapQuality: 'high' }))}
                  >
                    High
                  </Button>
                </View>
              )}
            />
            
            {/* Other settings */}
            <List.Item
              title="Download Over Cellular"
              right={() => (
                <Switch
                  value={settings.downloadOverCellular}
                  onValueChange={() => toggleSetting('downloadOverCellular')}
                  color={paperTheme.colors.primary}
                />
              )}
            />
            
            <List.Item
              title="Dark Mode"
              right={() => (
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  color={paperTheme.colors.primary}
                />
              )}
            />
            
            <List.Item
              title="Notifications"
              right={() => (
                <Switch
                  value={settings.notifications}
                  onValueChange={() => toggleSetting('notifications')}
                  color={paperTheme.colors.primary}
                />
              )}
            />
          </Card.Content>
        </Card>
        
        {/* About section */}
        <Card style={styles.aboutSection} elevation={0}>
          <Card.Content>
            <Title style={styles.sectionTitle}>About</Title>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Privacy Policy"
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => console.log('Privacy Policy')}
            />
            <List.Item
              title="Terms of Service"
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => console.log('Terms of Service')}
            />
            <List.Item
              title="Contact Support"
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => console.log('Contact Support')}
            />
            
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </Card.Content>
        </Card>
        
        {isAuthenticated && (
          <Button 
            mode="outlined" 
            icon="logout" 
            style={styles.logoutButton}
            color={paperTheme.colors.error}
            onPress={logout}
          >
            Log Out
          </Button>
        )}
      </ScrollView>
    </View>
  );
};

// Styles remain the same as your existing ProfileScreen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 40,
  },
  profileSection: {
    marginBottom: 16,
  },
  profileContent: {
    alignItems: 'center',
  },
  userName: {
    marginTop: 8,
    textAlign: 'center',
  },
  userEmail: {
    textAlign: 'center',
  },
  userJoinDate: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 16,
    textAlign: 'center',
  },
  premiumBadge: {
    backgroundColor: '#ee5253',
    marginTop: 8,
  },
  upgradeToPremiumButton: {
    marginTop: 8,
    borderColor: '#ee5253',
  },
  loginPrompt: {
    marginBottom: 16,
  },
  loginPromptContent: {
    alignItems: 'center',
  },
  loginPromptText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
  },
  settingsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  divider: {
    marginBottom: 8,
  },
  qualitySelector: {
    flexDirection: 'row',
  },
  qualityOption: {
    marginLeft: 4,
  },
  aboutSection: {
    marginBottom: 16,
  },
  versionText: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 12,
    textAlign: 'center',
  },
  logoutButton: {
    marginBottom: 32,
  },
});

export default ProfileScreen;
```

## Integration with Existing App

### 1. Create API Service with Authentication

Create a new file at `mobile/lutruwita-mobile/src/services/apiService.ts`:

```typescript
import { useAuth } from '../context/AuthContext';

// Base API URL
const API_URL = 'https://lutruwita2-next.vercel.app/api'; // Replace with your API URL

// API service hook
export const useApiService = () => {
  const { getAccessToken } = useAuth();
  
  // Generic fetch function with authentication
  const authenticatedFetch = async (
    endpoint: string, 
    options: RequestInit = {}
  ) => {
    try {
      // Get access token
      const token = await getAccessToken();
      
      // Set up headers with authentication
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
      };
      
      // Make the request
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });
      
      // Check if response is OK
      if (!response.ok) {
        // Handle different error status codes
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required');
        }
        
        throw new Error(`API error: ${response.status}`);
      }
      
      // Parse JSON response
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };
  
  // API methods
  return {
    // Routes
    getRoutes: () => authenticatedFetch('/routes'),
    getRouteById: (id: string) => authenticatedFetch(`/routes/${id}`),
    
    // User profile
    getUserProfile: () => authenticatedFetch('/user/profile'),
    updateUserProfile: (data: any) => authenticatedFetch('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    
    // Add more API methods as needed
  };
};
```

### 2. Update Route Service to Use Authentication

Update your existing `mobile/lutruwita-mobile/src/services/routeService.ts` to use the authenticated API service:

```typescript
import { useApiService } from './apiService';

export const useRouteService = () => {
  const api = useApiService();
  
  return {
    // Get all routes
    getRoutes: async () => {
      try {
        return await api.getRoutes();
      } catch (error) {
        console.error('Error fetching routes:', error);
        throw error;
      }
    },
    
    // Get route by ID
    getRouteById: async (id: string) => {
      try {
        return await api.getRouteById(id);
      } catch (error) {
        console.error(`Error fetching route ${id}:`, error);
        throw error;
      }
    },
    
    // Add more route-specific methods as needed
  };
};
```

## Testing and Troubleshooting

### 1. Testing Authentication Flow

1. **Test Login**:
   - Launch the app
   - Tap "Sign In / Sign Up"
   - Complete the Auth0 login flow
   - Verify you're redirected to the main app

2. **Test Token Refresh**:
   - Force token expiration (you can modify the expiry time for testing)
   - Perform an API request
   - Verify the token is refreshed automatically

3. **Test Logout**:
   - Go to the Profile screen
   - Tap "Log Out"
   - Verify you're redirected to the Auth screen

### 2. Common Issues and Solutions

#### Callback URL Issues

**Problem**: Auth0 returns an error about invalid callback URL.

**Solution**:
- Double-check the callback URL in Auth0 dashboard matches exactly what's in your app
- Ensure URL scheme is properly configured in Info.plist (iOS) and AndroidManifest.xml (Android)
- Check for typos in the URL scheme

#### Token Refresh Failures

**Problem**: Token refresh fails and user is logged out unexpectedly.

**Solution**:
- Verify refresh token is being stored correctly
- Check that the correct scopes are requested during login (must include `offline_access`)
- Ensure the refresh token hasn't been revoked in Auth0

#### Network Errors

**Problem**: Authentication fails due to network errors.

**Solution**:
- Add better error handling and retry logic
- Implement offline detection
- Add user-friendly error messages

## Advanced Features

### 1. Biometric Authentication

For added security, you can implement biometric authentication:

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

// In your AuthContext.tsx
const authenticateWithBiometrics = async (): Promise<boolean> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return false;
    
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access your account',
      fallbackLabel: 'Use password'
    });
    
    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
};

// Add this to your AuthContext
const [useBiometrics, setUseBiometrics] = useState(false);

// Check if biometrics should be used
useEffect(() => {
  const checkBiometricPreference = async () => {
    const preference = await AsyncStorage.getItem('useBiometrics');
    setUseBiometrics(preference === 'true');
  };
  
  checkBiometricPreference();
}, []);

// Modify your getAccessToken function to use biometrics
const getAccessToken = async (): Promise<string | null> => {
  try {
    if (!credentials) return null;
    
    // If biometrics is enabled, require authentication before returning token
    if (useBiometrics) {
      const authenticated = await authenticateWithBiometrics();
      if (!authenticated) {
        return null;
      }
    }
    
    // Rest of the function remains the same...
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};
```

### 2. Social Login Integration

Enhance your login experience by adding social login options:

```typescript
// In your AuthContext.tsx
const loginWithSocial = async (connection: 'google-oauth2' | 'facebook' | 'apple') => {
  try {
    setIsLoading(true);
    
    // Authorize with Auth0 using the specified connection
    const credentials = await auth0.webAuth.authorize({
      scope: 'openid profile email offline_access',
      audience: 'https://dev-8jmwfh4hugvdjwh8.au.auth0.com/api/v2/',
      connection // Specify the social connection to use
    });
    
    // Rest of the login process is the same as the regular login
    // ...
  } catch (error) {
    console.error(`${connection} login error:`, error);
  } finally {
    setIsLoading(false);
  }
};

// Then in your AuthScreen.tsx, add buttons for social login
<Button 
  mode="outlined"
  icon="google"
  onPress={() => loginWithSocial('google-oauth2')}
>
  Sign in with Google
</Button>

<Button 
  mode="outlined"
  icon="facebook"
  onPress={() => loginWithSocial('facebook')}
>
  Sign in with Facebook
</Button>
```

### 3. Guest Mode Implementation

Implement a guest mode for users who want to try the app without signing up:

```typescript
// In your AuthContext.tsx
const loginAsGuest = async () => {
  try {
    setIsLoading(true);
    
    // Generate a unique guest ID
    const guestId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Store guest status
    await AsyncStorage.setItem('isGuest', 'true');
    await AsyncStorage.setItem('guestId', guestId);
    
    // Set up guest user object
    const guestUser = {
      sub: guestId,
      name: 'Guest User',
      email: null,
      isGuest: true
    };
    
    // Store guest user
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(guestUser));
    
    // Update state
    setUser(guestUser);
    setIsAuthenticated(true);
    setIsGuest(true);
  } catch (error) {
    console.error('Guest login error:', error);
  } finally {
    setIsLoading(false);
  }
};

// Add a function to upgrade from guest to full account
const upgradeGuestAccount = async () => {
  try {
    // Get guest ID
    const guestId = await AsyncStorage.getItem('guestId');
    
    if (!guestId) {
      throw new Error('No guest account to upgrade');
    }
    
    // Perform regular login
    await login();
    
    // After successful login, migrate guest data
    // This would involve API calls to your backend to associate guest data with the new account
    
    // Clear guest status
    await AsyncStorage.removeItem('isGuest');
    await AsyncStorage.removeItem('guestId');
    setIsGuest(false);
  } catch (error) {
    console.error('Error upgrading guest account:', error);
  }
};
```

### 4. Multi-Device Synchronization

Implement synchronization for users who use both the web and mobile apps:

```typescript
// In your AuthContext.tsx
const syncUserData = async () => {
  try {
    // Get access token
    const token = await getAccessToken();
    if (!token) return;
    
    // Fetch user data from API
    const response = await fetch(`${API_URL}/user/sync`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }
    
    const syncData = await response.json();
    
    // Process and store synced data
    // This would involve updating local storage with data from the server
    
    console.log('User data synchronized successfully');
  } catch (error) {
    console.error('Sync error:', error);
  }
};

// Call this function after login and periodically while the app is in use
useEffect(() => {
  if (isAuthenticated && !isGuest) {
    syncUserData();
    
    // Set up periodic sync
    const syncInterval = setInterval(syncUserData, 15 * 60 * 1000); // Every 15 minutes
    
    return () => clearInterval(syncInterval);
  }
}, [isAuthenticated, isGuest]);
```

### 5. Offline Authentication

Implement offline authentication for when users don't have internet access:

```typescript
// In your AuthContext.tsx
const authenticateOffline = async (email: string, password: string): Promise<boolean> => {
  try {
    // This is a simplified example - in a real app, you would use a secure
    // hashing mechanism and not store the actual password
    
    // Get stored credentials
    const storedCredentials = await AsyncStorage.getItem('offlineAuth');
    if (!storedCredentials) return false;
    
    const auth = JSON.parse(storedCredentials);
    
    // Check if credentials match
    if (auth.email === email && auth.passwordHash === hashPassword(password)) {
      // Set up offline session
      const offlineUser = JSON.parse(await AsyncStorage.getItem(USER_KEY));
      
      if (offlineUser) {
        setUser(offlineUser);
        setIsAuthenticated(true);
        setIsOfflineMode(true);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Offline authentication error:', error);
    return false;
  }
};

// Store offline authentication data when user successfully logs in online
const storeOfflineAuthData = async () => {
  if (user && user.email) {
    // In a real app, you would use a secure method to store this data
    const offlineAuth = {
      email: user.email,
      passwordHash: '...' // You would store a secure hash, not the actual password
    };
    
    await AsyncStorage.setItem('offlineAuth', JSON.stringify(offlineAuth));
  }
};
```

## Running the App with Auth0 Authentication

Now that you've implemented Auth0 authentication in your mobile app, you can run it to test the authentication flow.

### 1. Set Up Environment Variables

Create a `.env` file in the `mobile/lutruwita-mobile` directory with the following content:

```
EXPO_PUBLIC_API_URL=https://lutruwita2-next.vercel.app
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Auth0 Configuration
EXPO_PUBLIC_AUTH0_DOMAIN=your-auth0-domain.region.auth0.com
EXPO_PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id
EXPO_PUBLIC_AUTH0_AUDIENCE=your-auth0-audience
```

### 2. Install Dependencies

Make sure all required dependencies are installed:

```bash
cd mobile/lutruwita-mobile
npm install
```

### 3. Start the App

Start the app using Expo:

```bash
npx expo start
```

This will start the Expo development server. You can then run the app on:

- iOS Simulator: Press `i` in the terminal
- Android Emulator: Press `a` in the terminal
- Physical device: Scan the QR code with the Expo Go app

### 4. Test Authentication Flow

1. When the app starts, you should see the Auth screen with "Sign In / Sign Up" button
2. Tap the button to initiate the Auth0 login flow
3. After successful authentication, you should be redirected to the main app
4. Go to the Profile screen to see your user information and test the logout functionality

### 5. Troubleshooting

If you encounter any issues:

1. Check the console logs for error messages
2. Verify that your Auth0 credentials are correct in the `.env` file
3. Make sure the URL scheme is properly configured in `app.json` and `app.config.js`
4. Confirm that the callback URL in Auth0 dashboard matches the one in your app
5. Check that you've installed all required dependencies

### 6. Next Steps

Once authentication is working, you can:

1. Implement protected routes in your app
2. Add user-specific features like saved routes
3. Implement premium content access control
4. Add social login options
5. Enhance the user profile screen with more user information
