# Lutruwita Native Mobile App: Features and Implementation

## Table of Contents
- [1. Feature Implementation](#1-feature-implementation)
  - [1.1 Map Search & Discovery](#11-map-search--discovery)
  - [1.2 Offline Map Functionality](#12-offline-map-functionality)
  - [1.3 Premium Content System](#13-premium-content-system)
  - [1.4 User Authentication](#14-user-authentication)
  - [1.5 User Experience](#15-user-experience)
  - [1.6 In-App Purchases](#16-in-app-purchases)
  - [1.7 Synchronization System](#17-synchronization-system)
- [2. Monetization Strategy](#2-monetization-strategy)
  - [2.1 Revenue Models](#21-revenue-models)
  - [2.2 Pricing Strategy](#22-pricing-strategy)
  - [2.3 Revenue Sharing](#23-revenue-sharing)
  - [2.4 Payment Processing](#24-payment-processing)

## 1. Feature Implementation

### 1.1 Map Search & Discovery

**Core Functionality:**
- Route search with comprehensive filtering
- Location-based discovery
- Personalized recommendations
- Social features (ratings, reviews)

**Implementation Details:**

1. **Search Interface:**
   ```jsx
   // SearchScreen.js
   import React, { useState, useEffect } from 'react';
   import { View, StyleSheet } from 'react-native';
   import { SearchBar, FilterButton, RouteList } from '../components';
   import { useRouteSearch } from '../hooks';
   
   const SearchScreen = () => {
     const [searchTerm, setSearchTerm] = useState('');
     const [filters, setFilters] = useState({
       state: '',
       region: '',
       distance: 'any',
       surfaceType: 'all',
       routeType: 'all',
     });
     
     const { routes, loading, error } = useRouteSearch(searchTerm, filters);
     
     return (
       <View style={styles.container}>
         <SearchBar 
           value={searchTerm}
           onChangeText={setSearchTerm}
         />
         <FilterButton onPress={() => /* Open filter modal */} />
         <RouteList 
           data={routes}
           loading={loading}
           error={error}
         />
       </View>
     );
   };
   ```

2. **Filter Implementation:**
   - Port existing filter logic from web app
   - Optimize UI for touch interactions
   - Add location-based filtering using device GPS
   - Implement filter persistence for user convenience

3. **Route Card Component:**
   - Create optimized card component for mobile
   - Implement lazy loading for images
   - Add gesture interactions (swipe, long press)
   - Include offline status indicators

4. **Location-Based Features:**
   ```javascript
   // locationService.js
   import Geolocation from 'react-native-geolocation-service';
   import { calculateDistance } from '../utils/geoUtils';
   
   export const getNearbyRoutes = async (userLocation, maxDistance = 50) => {
     try {
       const routes = await api.getRoutes();
       
       return routes.filter(route => {
         const routeStart = route.mapState.center;
         const distance = calculateDistance(
           userLocation.latitude,
           userLocation.longitude,
           routeStart[1],
           routeStart[0]
         );
         
         return distance <= maxDistance;
       });
     } catch (error) {
       console.error('Error fetching nearby routes:', error);
       throw error;
     }
   };
   ```

5. **Personalization Engine:**
   - Track user preferences and history
   - Implement recommendation algorithm
   - Create "For You" section in the app
   - Allow explicit preference settings

**API Requirements:**
- Optimize route listing endpoint for mobile
- Add pagination for efficient data loading
- Create endpoint for location-based queries
- Implement personalization API

**UI/UX Considerations:**
- Design for one-handed operation
- Implement pull-to-refresh for content updates
- Use bottom navigation for main app sections
- Ensure accessibility compliance

### 1.2 Offline Map Functionality

**Core Functionality:**
- Download routes for offline use
- Offline navigation with GPS
- Local storage of all route data
- Storage management tools

**Implementation Details:**

1. **Offline Map Management:**
   ```javascript
   // offlineMapService.js
   import MapboxGL from '@react-native-mapbox-gl/maps';
   import { getRouteById } from '../api/routeService';
   import { saveRouteData } from '../storage/routeStorage';
   
   export const downloadRouteForOffline = async (routeId, progressCallback) => {
     try {
       // 1. Fetch complete route data
       const routeData = await getRouteById(routeId);
       
       // 2. Save route data to local storage
       await saveRouteData(routeData);
       
       // 3. Determine map bounds from route
       const bounds = calculateBoundsFromRoute(routeData);
       
       // 4. Download map tiles for offline use
       const offlinePack = await MapboxGL.offlineManager.createPack({
         name: `route-${routeId}`,
         styleURL: MapboxGL.StyleURL.Street,
         minZoom: 10,
         maxZoom: 15,
         bounds: bounds,
       }, progressCallback);
       
       // 5. Download and cache all images
       await downloadRouteImages(routeData);
       
       return {
         routeId,
         offlinePackName: offlinePack.name,
         timestamp: new Date().toISOString(),
       };
     } catch (error) {
       console.error('Error downloading route for offline use:', error);
       throw error;
     }
   };
   ```

2. **Local Database Schema:**
   ```javascript
   // Database schema for offline routes
   const RouteSchema = {
     name: 'Route',
     primaryKey: 'persistentId',
     properties: {
       persistentId: 'string',
       name: 'string',
       type: 'string',
       isPublic: 'bool',
       isPremium: 'bool',
       isPurchased: 'bool',
       viewCount: 'int',
       createdAt: 'date',
       updatedAt: 'date',
       mapState: 'MapState',
       routes: 'Route[]',
       photos: 'Photo[]',
       pois: 'POI[]',
       metadata: 'RouteMetadata',
       offlineStatus: 'OfflineStatus',
     }
   };
   ```

3. **Download Manager:**
   - Create queue system for multiple downloads
   - Implement pause/resume functionality
   - Add background download capability
   - Provide detailed progress indicators

4. **Offline Navigation:**
   ```javascript
   // offlineNavigationService.js
   import Geolocation from 'react-native-geolocation-service';
   import { getOfflineRoute } from '../storage/routeStorage';
   import { calculateDistanceToRoute } from '../utils/navigationUtils';
   
   export const startOfflineNavigation = async (routeId) => {
     // 1. Load route data from local storage
     const routeData = await getOfflineRoute(routeId);
     
     if (!routeData) {
       throw new Error('Route not available offline');
     }
     
     // 2. Initialize navigation state
     const navigationState = {
       routeId,
       isActive: true,
       currentPosition: null,
       distanceToRoute: null,
       nextWaypoint: null,
       startTime: new Date(),
     };
     
     // 3. Start location tracking
     const watchId = Geolocation.watchPosition(
       (position) => {
         const { latitude, longitude } = position.coords;
         
         // Update navigation state
         navigationState.currentPosition = { latitude, longitude };
         navigationState.distanceToRoute = calculateDistanceToRoute(
           { latitude, longitude },
           routeData
         );
         navigationState.nextWaypoint = findNextWaypoint(
           { latitude, longitude },
           routeData
         );
         
         // Emit navigation update event
         navigationEventEmitter.emit('navigationUpdate', navigationState);
       },
       (error) => {
         console.error('Error watching position:', error);
         navigationEventEmitter.emit('navigationError', error);
       },
       {
         enableHighAccuracy: true,
         distanceFilter: 10,
         interval: 1000,
         fastestInterval: 500,
       }
     );
     
     return {
       navigationState,
       stopNavigation: () => {
         Geolocation.clearWatch(watchId);
         navigationState.isActive = false;
         navigationEventEmitter.emit('navigationStopped', navigationState);
       }
     };
   };
   ```

5. **Storage Management:**
   - Implement storage usage tracking
   - Create UI for managing downloaded content
   - Add auto-cleanup options for old content
   - Provide storage optimization recommendations

**API Requirements:**
- Create optimized bundle endpoint for offline downloads
- Implement delta updates for efficient syncing
- Add offline usage tracking endpoints

**Technical Challenges:**
- Efficient storage of large map datasets
- Battery optimization for GPS tracking
- Handling partial downloads and corrupted data
- Managing storage limitations on devices

### 1.3 Premium Content System

**Core Functionality:**
- Freemium model with basic/premium routes
- In-app purchases for premium content
- Subscription options for unlimited access
- Content licensing and entitlement management

**Implementation Details:**

1. **Premium Content Identification:**
   ```javascript
   // routeService.js
   export const getRouteAccessStatus = async (routeId) => {
     try {
       // 1. Check if route exists in local database
       const localRoute = await getLocalRoute(routeId);
       
       if (localRoute) {
         return {
           routeId,
           isAccessible: localRoute.isPurchased || !localRoute.isPremium,
           isPremium: localRoute.isPremium,
           isPurchased: localRoute.isPurchased,
           price: localRoute.price,
           subscriptionRequired: localRoute.subscriptionRequired,
         };
       }
       
       // 2. If not in local DB, fetch from API
       const routeInfo = await api.getRouteAccessInfo(routeId);
       
       // 3. Check user entitlements against route requirements
       const userEntitlements = await getUserEntitlements();
       const hasAccess = checkAccess(routeInfo, userEntitlements);
       
       return {
         routeId,
         isAccessible: hasAccess,
         isPremium: routeInfo.isPremium,
         isPurchased: userEntitlements.purchasedRoutes.includes(routeId),
         price: routeInfo.price,
         subscriptionRequired: routeInfo.subscriptionRequired,
       };
     } catch (error) {
       console.error('Error checking route access:', error);
       throw error;
     }
   };
   ```

2. **Purchase Flow Implementation:**
   ```javascript
   // purchaseService.js
   import { Platform } from 'react-native';
   import * as InAppPurchases from 'react-native-iap';
   import { validateReceipt } from '../api/purchaseService';
   import { updateUserEntitlements } from '../storage/userStorage';
   
   export const purchaseRoute = async (routeId, price) => {
     try {
       // 1. Get product ID for the route
       const productId = `route_${routeId}`;
       
       // 2. Initialize IAP module
       await InAppPurchases.initConnection();
       
       // 3. Get products from store
       const products = await InAppPurchases.getProducts([productId]);
       
       if (products.length === 0) {
         throw new Error('Product not available for purchase');
       }
       
       // 4. Make purchase
       const purchase = await InAppPurchases.requestPurchase(productId);
       
       // 5. Validate receipt with backend
       const validationResult = await validateReceipt(
         purchase.transactionReceipt,
         Platform.OS,
         routeId
       );
       
       if (validationResult.valid) {
         // 6. Update local entitlements
         await updateUserEntitlements({
           purchasedRoutes: [...userEntitlements.purchasedRoutes, routeId],
         });
         
         // 7. Finish transaction
         if (Platform.OS === 'ios') {
           await InAppPurchases.finishTransaction(purchase);
         }
         
         return {
           success: true,
           routeId,
           transactionId: purchase.transactionId,
         };
       } else {
         throw new Error('Receipt validation failed');
       }
     } catch (error) {
       console.error('Error purchasing route:', error);
       throw error;
     }
   };
   ```

3. **Subscription Management:**
   - Implement subscription purchase flow
   - Create subscription status checking
   - Add subscription management screen
   - Implement renewal handling

4. **Content Access Control:**
   ```javascript
   // accessControlService.js
   export const checkRouteAccess = async (routeId) => {
     try {
       // 1. Get route access status
       const accessStatus = await getRouteAccessStatus(routeId);
       
       // 2. If route is freely accessible, return true
       if (!accessStatus.isPremium) {
         return { hasAccess: true, reason: 'free_content' };
       }
       
       // 3. If route is purchased individually, return true
       if (accessStatus.isPurchased) {
         return { hasAccess: true, reason: 'purchased' };
       }
       
       // 4. Check if user has active subscription
       const subscriptionStatus = await getSubscriptionStatus();
       
       if (subscriptionStatus.isActive) {
         // Check if subscription level grants access to this route
         if (subscriptionStatus.tier === 'premium' || 
             (subscriptionStatus.tier === 'basic' && !accessStatus.subscriptionRequired)) {
           return { hasAccess: true, reason: 'subscription' };
         }
       }
       
       // 5. No access
       return { 
         hasAccess: false, 
         reason: 'requires_purchase',
         purchaseOptions: {
           individualPurchase: {
             available: true,
             price: accessStatus.price,
           },
           subscription: {
             available: true,
             requiredTier: accessStatus.subscriptionRequired ? 'premium' : 'basic',
           }
         }
       };
     } catch (error) {
       console.error('Error checking route access:', error);
       throw error;
     }
   };
   ```

5. **Premium Content UI:**
   - Create premium content indicators
   - Implement purchase prompts and flows
   - Design subscription marketing screens
   - Add "Purchased Content" library

**API Requirements:**
- Route access status endpoint
- Receipt validation service
- Entitlement management API
- Subscription status endpoint

**Security Considerations:**
- Server-side receipt validation
- Secure storage of purchase records
- Protection against unauthorized access
- Fraud prevention measures

### 1.4 User Authentication

**Core Functionality:**
- Seamless authentication with existing accounts
- Secure token storage and refresh
- Biometric authentication option
- Guest mode with upgrade path

**Implementation Details:**

1. **Auth0 Integration:**
   ```javascript
   // authService.js
   import Auth0 from 'react-native-auth0';
   import { setSecureItem, getSecureItem } from './secureStorage';
   
   const auth0 = new Auth0({
     domain: 'your-domain.auth0.com',
     clientId: 'your-client-id',
   });
   
   export const login = async () => {
     try {
       // 1. Authenticate with Auth0
       const credentials = await auth0.webAuth.authorize({
         scope: 'openid profile email offline_access',
         audience: 'https://your-domain.auth0.com/api/v2/',
       });
       
       // 2. Store tokens securely
       await setSecureItem('accessToken', credentials.accessToken);
       await setSecureItem('refreshToken', credentials.refreshToken);
       await setSecureItem('idToken', credentials.idToken);
       await setSecureItem('tokenExpiry', 
         (Date.now() + credentials.expiresIn * 1000).toString()
       );
       
       // 3. Fetch user profile
       const user = await auth0.auth.userInfo({ token: credentials.accessToken });
       
       // 4. Store user info
       await setSecureItem('userProfile', JSON.stringify(user));
       
       return user;
     } catch (error) {
       console.error('Login error:', error);
       throw error;
     }
   };
   ```

2. **Token Management:**
   ```javascript
   // tokenService.js
   export const getValidToken = async () => {
     try {
       const accessToken = await getSecureItem('accessToken');
       const tokenExpiry = await getSecureItem('tokenExpiry');
       
       // Check if token is expired or will expire soon
       if (!accessToken || !tokenExpiry || 
           Date.now() > parseInt(tokenExpiry) - 300000) { // 5 min buffer
         
         // Token expired, try to refresh
         return await refreshToken();
       }
       
       // Token is valid
       return accessToken;
     } catch (error) {
       console.error('Error getting valid token:', error);
       throw error;
     }
   };
   
   export const refreshToken = async () => {
     try {
       const refreshToken = await getSecureItem('refreshToken');
       
       if (!refreshToken) {
         throw new Error('No refresh token available');
       }
       
       // Refresh token with Auth0
       const newCredentials = await auth0.auth.refreshToken({
         refreshToken,
       });
       
       // Store new tokens
       await setSecureItem('accessToken', newCredentials.accessToken);
       await setSecureItem('tokenExpiry', 
         (Date.now() + newCredentials.expiresIn * 1000).toString()
       );
       
       return newCredentials.accessToken;
     } catch (error) {
       console.error('Token refresh error:', error);
       
       // Clear tokens and require new login
       await clearAuthTokens();
       throw error;
     }
   };
   ```

3. **Biometric Authentication:**
   ```javascript
   // biometricService.js
   import * as LocalAuthentication from 'expo-local-authentication';
   
   export const enableBiometricAuth = async () => {
     try {
       // 1. Check if device supports biometric authentication
       const compatible = await LocalAuthentication.hasHardwareAsync();
       
       if (!compatible) {
         throw new Error('Device does not support biometric authentication');
       }
       
       // 2. Check if biometric authentication is enrolled
       const enrolled = await LocalAuthentication.isEnrolledAsync();
       
       if (!enrolled) {
         throw new Error('No biometrics enrolled on this device');
       }
       
       // 3. Store user preference for biometric auth
       await setSecureItem('useBiometricAuth', 'true');
       
       return true;
     } catch (error) {
       console.error('Error enabling biometric auth:', error);
       throw error;
     }
   };
   
   export const authenticateWithBiometrics = async () => {
     try {
       const result = await LocalAuthentication.authenticateAsync({
         promptMessage: 'Authenticate to access your account',
         fallbackLabel: 'Use password',
       });
       
       return result.success;
     } catch (error) {
       console.error('Biometric authentication error:', error);
       return false;
     }
   };
   ```

4. **Guest Mode:**
   ```javascript
   // guestService.js
   import uuid from 'react-native-uuid';
   
   export const createGuestAccount = async () => {
     try {
       // 1. Generate guest ID
       const guestId = uuid.v4();
       
       // 2. Store guest status
       await setSecureItem('isGuest', 'true');
       await setSecureItem('guestId', guestId);
       
       // 3. Initialize guest data on server
       await api.initializeGuestUser(guestId);
       
       return {
         isGuest: true,
         guestId,
       };
     } catch (error) {
       console.error('Error creating guest account:', error);
       throw error;
     }
   };
   
   export const upgradeGuestAccount = async (credentials) => {
     try {
       // 1. Get guest ID
       const guestId = await getSecureItem('guestId');
       
       if (!guestId) {
         throw new Error('No guest account to upgrade');
       }
       
       // 2. Authenticate with Auth0
       const user = await login(credentials);
       
       // 3. Migrate guest data to authenticated user
       await api.migrateGuestData(guestId, user.sub);
       
       // 4. Clear guest status
       await setSecureItem('isGuest', 'false');
       
       return user;
     } catch (error) {
       console.error('Error upgrading guest account:', error);
       throw error;
     }
   };
   ```

**API Requirements:**
- Auth0 integration for mobile
- Guest account management endpoints
- User profile synchronization
- Token refresh handling

**Security Considerations:**
- Secure storage for authentication tokens
- Protection against token theft
- Biometric authentication security
- Secure guest-to-authenticated migration

### 1.5 User Experience

**Core Functionality:**
- User profile integration with web app
- Favorites and bookmarks system
- Personalized recommendations
- Social sharing features
- User feedback system

**Implementation Details:**

1. **User Profile Integration:**
   ```javascript
   // userProfileService.js
   export const getUserProfile = async () => {
     try {
       // 1. Get user ID
       const userProfile = JSON.parse(await getSecureItem('userProfile'));
       
       if (!userProfile || !userProfile.sub) {
         throw new Error('User not authenticated');
       }
       
       // 2. Fetch user profile from API
       const profile = await api.getUserProfile(userProfile.sub);
       
       return {
         ...profile,
         preferences: profile.preferences || {},
         activity: profile.activity || {},
         favorites: profile.favorites || [],
       };
     } catch (error) {
       console.error('Error getting user profile:', error);
       throw error;
     }
   };
   
   export const updateUserPreferences = async (preferences) => {
     try {
       // 1. Get user ID
       const userProfile = JSON.parse(await getSecureItem('userProfile'));
       
       if (!userProfile || !userProfile.sub) {
         throw new Error('User not authenticated');
       }
       
       // 2. Update preferences
       const updatedProfile = await api.updateUserPreferences(
         userProfile.sub,
         preferences
       );
       
       return updatedProfile;
     } catch (error) {
       console.error('Error updating user preferences:', error);
       throw error;
     }
   };
   ```

2. **Favorites and Bookmarks:**
   ```javascript
   // favoritesService.js
   export const getFavorites = async () => {
     try {
       // 1. Get user profile
       const profile = await getUserProfile();
       
       // 2. Fetch favorites with details
       const favorites = await api.getUserFavorites(profile.id);
       
       // 3. Process favorites for display
       return favorites.map(favorite => ({
         ...favorite,
         addedAt: new Date(favorite.addedAt),
         isDownloaded: isRouteDownloaded(favorite.id),
       }));
     } catch (error) {
       console.error('Error getting favorites:', error);
       throw error;
     }
   };
   
   export const toggleFavorite = async (routeId) => {
     try {
       // 1. Get user profile
       const profile = await getUserProfile();
       
       // 2. Check if route is already favorited
       const isFavorite = profile.favorites.includes(routeId);
       
       // 3. Toggle favorite status
       if (isFavorite) {
         await api.removeFromFavorites(profile.id, routeId);
       } else {
         await api.addToFavorites(profile.id, routeId);
       }
       
       // 4. Return updated status
       return {
         routeId,
         isFavorite: !isFavorite,
       };
     } catch (error) {
       console.error('Error toggling favorite:', error);
       throw error;
     }
   };
   ```

3. **Personalized Recommendations:**
   ```javascript
   // recommendationService.js
   export const getPersonalizedRecommendations = async () => {
     try {
       // 1. Get user profile
       const profile = await getUserProfile();
       
       // 2. Fetch recommendations from API
       const recommendations = await api.getRecommendations(profile.id);
       
       // 3. Process recommendations
       return {
         forYou: recommendations.forYou || [],
         basedOnHistory: recommendations.basedOnHistory || [],
         popular: recommendations.popular || [],
         nearby: recommendations.nearby || [],
       };
     } catch (error) {
       console.error('Error getting recommendations:', error);
       throw error;
     }
   };
   ```

4. **Social Sharing:**
   ```javascript
   // sharingService.js
   import Share from 'react-native-share';
   
   export const shareRoute = async (routeId) => {
     try {
       // 1. Get route details
       const route = await api.getRouteById(routeId);
       
       // 2. Generate share URL
       const shareUrl = `https://lutruwita.app/routes/${routeId}`;
       
       // 3. Create share options
       const shareOptions = {
         title: route.name,
         message: `Check out this route on Lutruwita: ${route.name}`,
         url: shareUrl,
       };
       
       // 4. Show share dialog
       const result = await Share.open(shareOptions);
       
       // 5. Track share event
       await api.trackShareEvent(routeId, result.app);
       
       return result;
     } catch (error) {
       console.error('Error sharing route:', error);
       throw error;
     }
   };
   ```

**API Requirements:**
- User profile synchronization endpoints
- Favorites management API
- Recommendation engine API
- Activity tracking endpoints

**UI/UX Considerations:**
- Seamless profile integration with web app
- Intuitive favorites management
- Engaging recommendation displays
- Simple sharing interface

### 1.6 In-App Purchases

**Core Functionality:**
- Individual route purchases
- Subscription management
- Receipt validation
- Restore purchases

**Implementation Details:**

1. **Product Configuration:**
   ```javascript
   // productConfig.js
   export const PRODUCT_TYPES = {
     ROUTE: 'route',
     SUBSCRIPTION_USER: 'user_subscription',
     SUBSCRIPTION_CREATOR: 'creator_subscription',
   };
   
   export const SUBSCRIPTION_TIERS = {
     USER: {
       BASIC: 'basic',
       PREMIUM: 'premium',
     },
     CREATOR: {
       STANDARD: 'standard',
       PROFESSIONAL: 'professional',
     },
   };
   
   export const getProductId = (type, id, tier) => {
     switch (type) {
       case PRODUCT_TYPES.ROUTE:
         return `route_${id}`;
       case PRODUCT_TYPES.SUBSCRIPTION_USER:
         return `user_subscription_${tier}`;
       case PRODUCT_TYPES.SUBSCRIPTION_CREATOR:
         return `creator_subscription_${tier}`;
       default:
         throw new Error(`Invalid product type: ${type}`);
     }
   };
   ```

2. **Purchase Management:**
   ```javascript
   // purchaseManager.js
   import { Platform } from 'react-native';
   import * as InAppPurchases from 'react-native-iap';
   import { getProductId, PRODUCT_TYPES } from './productConfig';
   
   export const initializePurchases = async () => {
     try {
       // 1. Initialize IAP module
       await InAppPurchases.initConnection();
       
       // 2. Set up purchase listener
       InAppPurchases.purchaseUpdatedListener(async (purchase) => {
         // Handle purchase updates
         if (purchase.purchaseState === 'PURCHASED') {
           await validateAndProcessPurchase(purchase);
         }
       });
       
       // 3. Set up error listener
       InAppPurchases.purchaseErrorListener((error) => {
         console.error('Purchase error:', error);
       });
       
       return true;
     } catch (error) {
       console.error('Error initializing purchases:', error);
       throw error;
     }
   };
   
   export const getProducts = async (productIds) => {
     try {
       return await InAppPurchases.getProducts(productIds);
     } catch (error) {
       console.error('Error getting products:', error);
       throw error;
     }
   };
   
   export const purchaseProduct = async (productId) => {
     try {
       return await InAppPurchases.requestPurchase(productId);
     } catch (error) {
       console.error('Error purchasing product:', error);
       throw error;
     }
   };
   
   export const validateAndProcessPurchase = async (purchase) => {
     try {
       // 1. Validate receipt with backend
       const validationResult = await api.validateReceipt(
         purchase.transactionReceipt,
         Platform.OS,
         purchase.productId
       );
       
       if (!validationResult.valid) {
         throw new Error('Receipt validation failed');
       }
       
       // 2. Process purchase based on product type
       if (purchase.productId.startsWith('route_')) {
         await processRoutePurchase(purchase, validationResult);
       } else if (purchase.productId.startsWith('user_subscription_')) {
         await processUserSubscriptionPurchase(purchase, validationResult);
       } else if (purchase.productId.startsWith('creator_subscription_')) {
         await processCreatorSubscriptionPurchase(purchase, validationResult);
       }
       
       // 3. Finish transaction
       if (Platform.OS === 'ios') {
         await InAppPurchases.finishTransaction(purchase);
       }
       
       return {
         success: true,
         productId: purchase.productId,
         transactionId: purchase.transactionId,
       };
     } catch (error) {
       console.error('Error validating purchase:', error);
       throw error;
     }
   };
   ```

3. **Restore Purchases:**
   ```javascript
   // restorePurchases.
