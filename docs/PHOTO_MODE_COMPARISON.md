# Photo Mode Comparison: Creation vs Presentation

## Overview

In both creation and presentation modes, photos have three key behaviors:
1. They load on initialization
2. They cluster on initialization
3. They persist when switching routes

## Implementation Details

### Core Files to Replicate

1. **PhotoContext (src/features/photo/context/PhotoContext.tsx)**
   - Manages photo state
   - Provides methods for:
     - Adding photos
     - Deleting photos
     - Updating photos
     - Loading photos
     - Direct state setting

2. **Clustering Utilities (src/features/photo/utils/clustering.ts)**
   - Handles photo clustering logic
   - Uses Supercluster for clustering implementation
   - Defines interfaces for photo features and clusters
   - Provides helper functions for:
     - Creating cluster index
     - Getting cluster expansion zoom
     - Checking if a feature is a cluster

3. **PhotoLayer Component**
   - Creation Mode: src/features/photo/components/PhotoLayer/PhotoLayer.tsx
   - Presentation Mode: src/features/presentation/components/PhotoLayer/PresentationPhotoLayer.tsx

### Key Differences and Required Changes

#### 1. Photo Loading

**Creation Mode:**
- Photos are managed through PhotoContext
- Uses direct photo manipulation methods (add, delete, update)
- Photos persist naturally through state management

**Presentation Mode:**
- Currently loads photos from route state
- Needs to replicate the same persistence behavior
- Required changes:
  ```typescript
  // Add useEffect for photo loading in PresentationPhotoLayer
  useEffect(() => {
    if (!currentRoute || currentRoute._type !== 'loaded') {
      setPhotos([]);
      return;
    }
    
    if (currentRoute._loadedState?.photos) {
      setPhotos(currentRoute._loadedState.photos.map(photo => ({
        ...photo,
        dateAdded: new Date(photo.dateAdded)
      })));
    }
  }, [currentRoute, setPhotos]);
  ```

#### 2. Clustering Behavior

Both modes should use the same clustering logic:
- Use the shared clustering utilities
- Implement the same zoom handling
- Use identical cluster click behavior
- Maintain the same cluster expansion logic

```typescript
// Clustering configuration (same for both modes)
const clusterConfig = {
  radius: 60,
  maxZoom: 16,
  minZoom: 0
};

// Cluster click handling (same for both modes)
const handleClusterClick = (cluster: ClusterFeature) => {
  if (!map) return;
  const expansionZoom = getClusterExpansionZoom(cluster.properties.cluster_id, clusteredItems);
  const targetZoom = Math.min(expansionZoom + 1.5, 20);
  map.easeTo({
    center: [lng, lat],
    zoom: targetZoom
  });
};
```

#### 3. Route Persistence

**Creation Mode:**
- Photos persist through PhotoContext state
- No special handling needed for route changes

**Presentation Mode:**
- Must use the same PhotoContext
- Should maintain photo state across route changes
- Required implementation:
  ```typescript
  // In PresentationPhotoLayer
  const { photos, setPhotos } = usePhotoContext();
  const { currentRoute } = useRouteContext();

  // Load photos when route changes
  useEffect(() => {
    if (currentRoute?._loadedState?.photos) {
      setPhotos(currentRoute._loadedState.photos);
    }
  }, [currentRoute]);
  ```

### Shared Components

Both modes should use these shared components:
1. PhotoMarker
2. PhotoCluster
3. PhotoPreviewModal

## Implementation Checklist

To ensure presentation mode works exactly like creation mode:

1. [ ] Use PhotoContext for state management
2. [ ] Implement photo loading from route state
3. [ ] Use shared clustering utilities
4. [ ] Implement identical zoom handling
5. [ ] Use shared components (PhotoMarker, PhotoCluster, PhotoPreviewModal)
6. [ ] Ensure proper photo persistence across route changes
7. [ ] Maintain the same cluster click behavior
8. [ ] Use the same coordinate normalization logic

## Testing Verification

To verify the implementation:
1. Photos should load immediately when a route is loaded
2. Photos should cluster at the same zoom levels
3. Photos should persist when switching between routes
4. Cluster expansion should work identically
5. Photo previews should work the same way
6. Coordinate normalization should handle edge cases consistently
