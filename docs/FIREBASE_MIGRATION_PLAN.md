# Firebase Migration Plan

## Overview

This document outlines a comprehensive plan to migrate our application from the current MongoDB + Cloudinary architecture to a Firebase-centric solution. The migration will be implemented in phases to ensure stability and minimize disruption to the application.

## Current Architecture

- **MongoDB**: Primary database for storing route data, POIs, and metadata
- **Cloudinary**: Storage for photos and image assets
- **Firebase**: Currently used only for optimized data in presentation mode

## Target Architecture

- **Firestore**: Primary database for all structured data
- **Firebase Storage**: All photos, images, and binary assets
- **Firebase Authentication**: Integration with Auth0 (optional future enhancement)
- **Firebase Hosting**: Static assets and application (optional future enhancement)

## Benefits of Migration

1. **Performance**: Faster loading times, especially on mobile devices
2. **Scalability**: More flexible data structure that can grow with the application
3. **Cost Efficiency**: Potentially lower costs with Firebase's pay-as-you-go model
4. **Simplified Architecture**: Single platform for data and storage
5. **Real-time Capabilities**: Built-in support for real-time updates
6. **Offline Support**: Better offline capabilities for mobile applications

## Data Structure Design

We will implement a hierarchical collection structure in Firestore:

```
routes/
  ├── route_metadata/
  │     ├── route1_id/
  │     │     ├── name: "Tasmania Trail"
  │     │     ├── type: "bikepacking"
  │     │     ├── isPublic: true
  │     │     ├── createdAt: timestamp
  │     │     └── ...basic metadata
  │     └── route2_id/...
  │
  ├── route_geojson/
  │     ├── route1_id/
  │     │     └── geojson data
  │     └── route2_id/...
  │
  ├── route_pois/
  │     ├── route1_id/
  │     │     ├── poi1_id/...
  │     │     └── poi2_id/...
  │     └── route2_id/...
  │
  ├── route_lines/
  │     ├── route1_id/...
  │     └── route2_id/...
  │
  └── route_photos/
        ├── route1_id/...
        └── route2_id/...

type_index/
  ├── bikepacking/
  │     ├── route1_id: true
  │     └── route3_id: true
  ├── tourism/
  │     └── route2_id: true
  └── event/
        └── route4_id: true
```

For Firebase Storage, we'll use a similar hierarchical structure:

```
routes/
  ├── route1_id/
  │     ├── photos/
  │     │     ├── photo1_id.jpg
  │     │     └── photo2_id.jpg
  │     ├── thumbnail.jpg
  │     └── preview.jpg
  └── route2_id/...

users/
  ├── user1_id/
  │     ├── profile.jpg
  │     └── settings.json
  └── user2_id/...

static/
  ├── logos/
  └── icons/
```

## Migration Phases

### Phase 1: Firebase Infrastructure Setup (2-3 weeks)

1. **Firebase Project Configuration**
   - Set up Firebase project
   - Configure security rules
   - Set up development, staging, and production environments

2. **Data Structure Implementation**
   - Create collection structure
   - Define indexes
   - Implement security rules

3. **Firebase Storage Setup**
   - Configure storage buckets
   - Define storage security rules
   - Create folder structure

4. **Authentication Integration**
   - Integrate Firebase with Auth0
   - Test authentication flow
   - Implement user management

### Phase 2: Dual-Write Implementation (3-4 weeks)

1. **Firebase Service Layer**
   - Create Firebase service modules
   - Implement CRUD operations
   - Add error handling and retry logic

2. **Adapter Layer**
   - Create adapters to transform data between MongoDB and Firebase formats
   - Implement validation to ensure data consistency

3. **Dual-Write Logic**
   - Modify API endpoints to write to both MongoDB and Firebase
   - Implement transaction-like behavior with rollback capability
   - Add monitoring and logging

4. **Photo Migration Strategy**
   - Develop utilities to migrate photos from Cloudinary to Firebase Storage
   - Create URL mapping system for transitioning period
   - Implement photo upload to both systems during transition

### Phase 3: Read Migration (2-3 weeks)

1. **Feature Flag System**
   - Implement feature flags to control data source
   - Create fallback mechanisms

2. **Firebase Read Implementation**
   - Modify client code to read from Firebase
   - Implement caching strategies
   - Add performance monitoring

3. **Gradual Rollout**
   - Start with non-critical features
   - Monitor performance and errors
   - Gradually increase Firebase read percentage

4. **Photo Retrieval Migration**
   - Implement Firebase Storage URL generation
   - Add fallback to Cloudinary
   - Monitor performance and bandwidth usage

### Phase 4: Full Firebase Operation (2-3 weeks)

1. **MongoDB Decommissioning Plan**
   - Verify all functionality works with Firebase
   - Create database snapshots for backup
   - Plan for read-only MongoDB period

2. **Cloudinary Decommissioning Plan**
   - Verify all assets are migrated to Firebase Storage
   - Create asset inventory and verification
   - Plan for read-only Cloudinary period

3. **Cleanup**
   - Remove dual-write code
   - Remove fallback mechanisms
   - Optimize Firebase-specific code

4. **Performance Optimization**
   - Implement Firebase-specific optimizations
   - Fine-tune indexes and queries
   - Optimize storage access patterns

## Implementation Details

### Firebase Service Layer

```javascript
// Example Firebase service for route metadata
export const RouteMetadataService = {
  // Create new route metadata
  async create(routeId, metadata) {
    return await firebase.firestore()
      .collection('routes/route_metadata')
      .doc(routeId)
      .set(metadata);
  },
  
  // Get route metadata
  async get(routeId) {
    return await firebase.firestore()
      .collection('routes/route_metadata')
      .doc(routeId)
      .get();
  },
  
  // Update route metadata
  async update(routeId, metadata) {
    return await firebase.firestore()
      .collection('routes/route_metadata')
      .doc(routeId)
      .update(metadata);
  },
  
  // Delete route metadata
  async delete(routeId) {
    return await firebase.firestore()
      .collection('routes/route_metadata')
      .doc(routeId)
      .delete();
  },
  
  // List routes with filtering
  async list(filters = {}) {
    let query = firebase.firestore().collection('routes/route_metadata');
    
    // Apply filters
    if (filters.type) {
      // Use the type index for better performance
      const typeDoc = await firebase.firestore()
        .collection('type_index')
        .doc(filters.type)
        .get();
        
      const routeIds = Object.keys(typeDoc.data() || {});
      
      // Use "in" query to get routes by IDs
      query = query.where(firebase.firestore.FieldPath.documentId(), 'in', routeIds);
    }
    
    if (filters.isPublic !== undefined) {
      query = query.where('isPublic', '==', filters.isPublic);
    }
    
    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    
    return await query.get();
  }
};

// Example Firebase service for route GeoJSON
export const RouteGeoJSONService = {
  async get(routeId) {
    return await firebase.firestore()
      .collection('routes/route_geojson')
      .doc(routeId)
      .get();
  },
  
  async update(routeId, geojson) {
    return await firebase.firestore()
      .collection('routes/route_geojson')
      .doc(routeId)
      .set(geojson);
  }
};

// Example Firebase service for photos
export const RoutePhotoService = {
  // Upload photo to Firebase Storage
  async uploadPhoto(routeId, photoFile) {
    const filename = `${Date.now()}_${photoFile.name}`;
    const storageRef = firebase.storage().ref(`routes/${routeId}/photos/${filename}`);
    
    // Upload file
    const uploadTask = await storageRef.put(photoFile);
    
    // Get download URL
    const downloadURL = await uploadTask.ref.getDownloadURL();
    
    // Create photo metadata in Firestore
    const photoRef = firebase.firestore()
      .collection('routes/route_photos')
      .doc(routeId)
      .collection('photos')
      .doc();
      
    await photoRef.set({
      url: downloadURL,
      filename,
      contentType: photoFile.type,
      size: photoFile.size,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      id: photoRef.id,
      url: downloadURL
    };
  },
  
  // Get all photos for a route
  async getPhotos(routeId) {
    const snapshot = await firebase.firestore()
      .collection('routes/route_photos')
      .doc(routeId)
      .collection('photos')
      .get();
      
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
};
```

### Complete Route Loading

```javascript
// Load a complete route with all related data
export const loadCompleteRoute = async (routeId) => {
  // Load all components in parallel for better performance
  const [
    metadataDoc, 
    geojsonDoc, 
    poisSnapshot,
    linesSnapshot,
    photosSnapshot
  ] = await Promise.all([
    firebase.firestore().collection('routes/route_metadata').doc(routeId).get(),
    firebase.firestore().collection('routes/route_geojson').doc(routeId).get(),
    firebase.firestore().collection('routes/route_pois').doc(routeId).collection('pois').get(),
    firebase.firestore().collection('routes/route_lines').doc(routeId).collection('lines').get(),
    firebase.firestore().collection('routes/route_photos').doc(routeId).collection('photos').get()
  ]);
  
  // Transform POIs, lines, and photos into arrays
  const pois = poisSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  const lines = linesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  const photos = photosSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Combine all data
  return {
    id: routeId,
    ...metadataDoc.data(),
    geojson: geojsonDoc.data(),
    pois,
    lines,
    photos
  };
};
```

### Migration Utilities

```javascript
// Utility to migrate a route from MongoDB to Firebase
export const migrateRouteToFirebase = async (routeId) => {
  // Fetch route from MongoDB
  const route = await fetchRouteFromMongoDB(routeId);
  
  // Create a batch for atomic operations
  const batch = firebase.firestore().batch();
  
  // Add metadata
  const metadataRef = firebase.firestore().collection('routes/route_metadata').doc(routeId);
  batch.set(metadataRef, {
    name: route.name,
    type: route.type,
    isPublic: route.isPublic,
    userId: route.userId,
    createdAt: firebase.firestore.Timestamp.fromDate(new Date(route.createdAt)),
    updatedAt: firebase.firestore.Timestamp.fromDate(new Date(route.updatedAt))
  });
  
  // Add GeoJSON
  const geojsonRef = firebase.firestore().collection('routes/route_geojson').doc(routeId);
  batch.set(geojsonRef, route.geojson);
  
  // Add to type index
  const typeIndexRef = firebase.firestore().collection('type_index').doc(route.type);
  batch.set(typeIndexRef, { [routeId]: true }, { merge: true });
  
  // Commit the batch
  await batch.commit();
  
  // Migrate POIs (separate batch to avoid size limits)
  await migratePOIs(routeId, route.pois);
  
  // Migrate lines (separate batch)
  await migrateLines(routeId, route.lines);
  
  // Migrate photos (this will take longer as it involves downloading and re-uploading)
  await migratePhotos(routeId, route.photos);
  
  console.log(`Route ${routeId} migrated successfully`);
};

// Utility to migrate photos from Cloudinary to Firebase Storage
export const migratePhotos = async (routeId, photos) => {
  for (const photo of photos) {
    // Download from Cloudinary
    const response = await fetch(photo.url);
    const blob = await response.blob();
    
    // Upload to Firebase Storage
    const storageRef = firebase.storage().ref(`routes/${routeId}/photos/${photo.id}.jpg`);
    await storageRef.put(blob);
    
    // Get the new URL
    const downloadURL = await storageRef.getDownloadURL();
    
    // Store metadata in Firestore
    await firebase.firestore()
      .collection('routes/route_photos')
      .doc(routeId)
      .collection('photos')
      .doc(photo.id)
      .set({
        url: downloadURL,
        originalUrl: photo.url,
        caption: photo.caption,
        createdAt: firebase.firestore.Timestamp.fromDate(new Date(photo.createdAt))
      });
  }
};
```

## Testing Strategy

1. **Unit Testing**
   - Test Firebase service functions
   - Test data transformation adapters
   - Test error handling and retry logic

2. **Integration Testing**
   - Test dual-write functionality
   - Test fallback mechanisms
   - Test data consistency between MongoDB and Firebase

3. **Performance Testing**
   - Compare load times between MongoDB and Firebase
   - Measure bandwidth usage for photo storage
   - Test under various network conditions

4. **User Acceptance Testing**
   - Test with a subset of users
   - Gather feedback on performance and reliability
   - Identify any issues with the new architecture

## Rollback Plan

1. **Immediate Rollback**
   - Feature flags to switch back to MongoDB/Cloudinary
   - Monitoring alerts for performance degradation
   - Emergency response team on standby during critical phases

2. **Partial Rollback**
   - Ability to roll back specific features
   - Maintain dual-read capability during transition
   - Versioned API endpoints for backward compatibility

## Timeline and Milestones

### Month 1
- Complete Firebase project setup
- Implement data structure
- Create service layer
- Begin dual-write implementation

### Month 2
- Complete dual-write implementation
- Begin photo migration
- Start read migration for non-critical features
- Implement monitoring and alerting

### Month 3
- Complete read migration
- Finalize photo migration
- Begin MongoDB/Cloudinary decommissioning planning
- Performance optimization

### Month 4
- Complete transition to Firebase
- Remove dual-write/dual-read code
- Final performance optimizations
- Documentation and knowledge transfer

## Success Metrics

1. **Performance**
   - 50% or greater improvement in route loading time
   - 30% or greater improvement in photo loading time
   - Reduced API server load

2. **Reliability**
   - Zero data loss during migration
   - 99.9% uptime during transition
   - Reduced error rates

3. **Cost Efficiency**
   - Reduced overall infrastructure costs
   - More predictable scaling costs
   - Lower maintenance overhead

## Conclusion

This migration plan provides a structured approach to transitioning from our current MongoDB/Cloudinary architecture to a Firebase-centric solution. By implementing the migration in phases and maintaining backward compatibility throughout the process, we can ensure a smooth transition with minimal disruption to users.

The hierarchical data structure in Firebase will provide better performance, scalability, and flexibility for future feature development. The integration of Firebase Storage for photos will simplify our architecture and potentially reduce costs.

By following this plan, we can achieve a more modern, performant, and maintainable application architecture that better serves our users' needs.
