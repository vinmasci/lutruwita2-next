# Lutruwita Native Mobile App: Overview and Architecture

## Table of Contents
- [1. Project Overview](#1-project-overview)
  - [1.1 Vision and Goals](#11-vision-and-goals)
  - [1.2 Target Audience](#12-target-audience)
  - [1.3 Key Features](#13-key-features)
  - [1.4 Success Metrics](#14-success-metrics)
- [2. Technical Architecture](#2-technical-architecture)
  - [2.1 Technology Stack](#21-technology-stack)
  - [2.2 System Architecture](#22-system-architecture)
  - [2.3 Data Flow](#23-data-flow)
  - [2.4 Integration Points](#24-integration-points)

## 1. Project Overview

### 1.1 Vision and Goals

The Lutruwita Native Mobile App aims to transform our existing web platform into a comprehensive mobile experience that enables users to discover, access, and utilize hiking/biking routes in Tasmania, with a particular focus on offline functionality and premium content. 

**Primary Goals:**
- Create a seamless, native mobile experience for iOS and Android users
- Enable offline access to maps, routes, and associated content
- Implement a sustainable monetization strategy through premium content
- Establish a creator ecosystem where route authors can monetize their content
- Maintain the core functionality and quality of the web platform while optimizing for mobile

**Strategic Objectives:**
- Increase user engagement and retention through mobile-specific features
- Expand the user base by reaching mobile-only users
- Create new revenue streams through premium content and creator subscriptions
- Build a sustainable ecosystem that benefits both users and content creators
- Position Lutruwita as the definitive platform for Tasmanian route discovery

### 1.2 Target Audience

**Primary User Segments:**

1. **Active Hikers/Bikers**
   - Frequent outdoor enthusiasts who regularly use route information
   - Highly value offline access for remote areas with poor connectivity
   - Willing to pay for premium, high-quality routes

2. **Casual Explorers**
   - Occasional hikers/bikers looking for accessible routes
   - Primarily interested in free content with good filtering options
   - May purchase premium routes for special trips

3. **Tourists**
   - Visitors to Tasmania seeking curated experiences
   - High willingness to pay for premium content during their visit
   - Need comprehensive information and offline access

4. **Content Creators**
   - Local experts and experienced hikers/bikers
   - Looking to monetize their knowledge and route creation
   - Value tools that help them create and market their routes

5. **Professional Guides**
   - Tour operators and professional guides
   - Use the platform to showcase their expertise
   - May create premium routes as marketing for their services

### 1.3 Key Features

1. **Map Search & Discovery**
   - Comprehensive route filtering (location, difficulty, length, surface type)
   - Location-based recommendations
   - Personalized suggestions based on user history
   - Social features (ratings, reviews, favorites)

2. **Offline Functionality**
   - Complete offline map access for downloaded routes
   - Offline navigation with GPS tracking
   - Downloadable route bundles with all associated content
   - Storage management tools for device optimization

3. **Premium Content System**
   - Freemium model with basic routes available for free
   - Premium routes available for purchase
   - Subscription options for unlimited access
   - Bundle packages for regions or route types

4. **Creator Tools**
   - Route creation and editing tools
   - Analytics dashboard for creators
   - Monetization controls and pricing options
   - Promotion tools for marketing routes

5. **Enhanced Mobile Experience**
   - Native device integration (camera, GPS, notifications)
   - Augmented reality features for route visualization
   - Voice-guided navigation
   - Social sharing capabilities

### 1.4 Success Metrics

**User Engagement Metrics:**
- Monthly Active Users (MAU)
- Average session duration
- Route views and completions
- Offline usage statistics
- Feature adoption rates

**Business Metrics:**
- App downloads and installs
- Conversion rate (free to paid users)
- Average Revenue Per User (ARPU)
- Creator subscription adoption
- Premium route purchases
- Retention and churn rates

**Quality Metrics:**
- App Store ratings and reviews
- Crash-free session rate
- Support ticket volume
- Feature request frequency
- Net Promoter Score (NPS)

## 2. Technical Architecture

### 2.1 Technology Stack

**Mobile App Development:**
- **Framework:** React Native with Expo
  - Enables cross-platform development with a single codebase
  - Leverages existing React expertise from web app
  - Provides access to native device features
  - Expo simplifies development, testing, and deployment

- **State Management:**
  - Redux for global state management
  - Context API for component-level state
  - Redux Persist for offline state persistence

- **UI Components:**
  - React Native Paper for material design components
  - React Native Elements for additional UI components
  - Custom components for specialized map interactions

- **Navigation:**
  - React Navigation for app navigation structure
  - Deep linking support for external URL handling

- **Maps and Geolocation:**
  - Mapbox GL Native for high-performance maps
  - React Native Mapbox GL for React Native integration
  - Turf.js for geospatial calculations
  - React Native Geolocation for device location

- **Offline Capabilities:**
  - Realm or SQLite for local database
  - AsyncStorage for simple key-value storage
  - Mapbox offline packs for map tile caching
  - Custom sync engine for data synchronization

- **Authentication:**
  - Auth0 React Native SDK for authentication
  - Secure storage for token management
  - Biometric authentication integration

- **In-App Purchases:**
  - React Native In-App Purchase for iOS
  - React Native Billing for Android
  - Server-side receipt validation

**Backend Services:**
- **API Extensions:**
  - New endpoints for mobile-specific features
  - Optimized payload structures for mobile
  - Versioned API for backward compatibility

- **Offline Sync Service:**
  - Conflict resolution system
  - Delta updates for efficient synchronization
  - Background sync scheduling

- **Payment Processing:**
  - Stripe for payment processing
  - Apple Pay and Google Pay integration
  - Subscription management system

- **Analytics and Monitoring:**
  - Firebase Analytics for user behavior
  - Crashlytics for crash reporting
  - Custom event tracking for business metrics

### 2.2 System Architecture

The mobile app will follow a layered architecture pattern:

**1. Presentation Layer:**
- React Native components and screens
- UI state management
- User interaction handling

**2. Business Logic Layer:**
- Feature-specific logic
- State management (Redux/Context)
- API integration

**3. Data Access Layer:**
- Local database interactions
- API client for remote data
- Synchronization logic

**4. Service Layer:**
- Authentication services
- Map services
- Purchase services
- Offline management services

**Backend Architecture Extensions:**

**1. Mobile API Gateway:**
- Optimized endpoints for mobile clients
- Request/response compression
- Batch operations for efficient data transfer

**2. Offline Sync Service:**
- Conflict detection and resolution
- Change tracking and versioning
- Differential synchronization

**3. Purchase Validation Service:**
- Receipt validation for App Store/Google Play
- Entitlement management
- Subscription status tracking

**4. Analytics Aggregation:**
- Event collection and processing
- User behavior analysis
- Business metrics calculation

### 2.3 Data Flow

**Online Mode Data Flow:**
1. User opens app and authenticates
2. App fetches initial data from API
3. User interacts with maps and routes
4. App makes real-time API calls for data
5. Updates are immediately reflected in UI

**Offline Mode Data Flow:**
1. User downloads routes for offline use
2. App stores all necessary data locally
3. User interacts with offline content
4. Changes are stored in local database
5. When online, app syncs changes with server

**Purchase Flow:**
1. User browses premium routes
2. User initiates purchase
3. App communicates with App Store/Google Play
4. Purchase is validated with backend
5. User gains access to premium content
6. Creator receives revenue share

**Creator Content Flow:**
1. Creator publishes route on web platform
2. Backend processes and optimizes for mobile
3. Route becomes available in mobile app
4. Users discover and purchase content
5. Analytics data flows back to creator dashboard

### 2.4 Integration Points

**Existing System Integration:**
- Authentication system (Auth0)
- Route data API
- User profile management
- Content management system

**New Integration Points:**
- App Store In-App Purchase API
- Google Play Billing API
- Offline map tile service
- Push notification service
- Analytics and crash reporting

**Third-Party Service Integration:**
- Mapbox GL Native
- Stripe payment processing
- Firebase services
- Social sharing APIs
- Device hardware (camera, GPS, accelerometer)
