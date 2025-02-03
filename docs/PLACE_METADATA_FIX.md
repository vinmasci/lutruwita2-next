# Place Metadata Implementation Fix

## Current Problem

The current implementation tries to store place metadata (description, photos) by updating POIs, which is incorrect because:

1. Places come from Mapbox's place labels (cities, towns, suburbs)
2. POIs are points of interest within places (markers for specific locations)
3. The code tries to use POIs to store place metadata by:
   - Finding all POIs associated with a place
   - Updating all of them with the place's description/photos
   - This causes race conditions and unnecessary updates

## Solution Steps

### 1. Create Place Types

```typescript
// src/features/place/types/place.types.ts
export interface Place {
  id: string;          // Mapbox place ID
  name: string;        // Place name from Mapbox
  description?: string;
  photos?: PlacePhoto[];
  coordinates: [number, number];
  updatedAt: string;
}

export interface PlacePhoto {
  url: string;
  caption?: string;
  createdAt: string;
}
```

### 2. Create Place Context

```typescript
// src/features/place/context/PlaceContext.tsx
interface PlaceContextType {
  places: Record<string, Place>;
  updatePlace: (id: string, updates: Partial<Place>) => Promise<void>;
}

// Store places in localStorage similar to POIs
const STORAGE_KEY = 'lutruwita2_places';
```

### 3. Update PlacePOILayer

```typescript
// src/features/poi/components/PlacePOILayer/PlacePOILayer.tsx
const { places, updatePlace } = usePlaceContext();

// When selecting a place
const handlePlaceClick = (place: PlaceLabel) => {
  const placeData = places[place.id] || {
    id: place.id,
    name: place.name,
    coordinates: place.coordinates,
    updatedAt: new Date().toISOString()
  };
  setSelectedPlace(placeData);
};
```

### 4. Update PlacePOIDetailsDrawer

```typescript
// src/features/poi/components/POIDetailsDrawer/PlacePOIDetailsDrawer.tsx
interface PlacePOIDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place | null;
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!place) return;
  
  setIsSaving(true);
  try {
    // Process new photos
    const processedPhotos = await createPlacePhotos(newPhotos);
    
    // Update place metadata
    await updatePlace(place.id, {
      description,
      photos: [...existingPhotos, ...processedPhotos],
      updatedAt: new Date().toISOString()
    });

    setNewPhotos([]);
    setIsEditing(false);
    onClose();
  } catch (error) {
    console.error('Failed to save place details:', error);
  } finally {
    setIsSaving(false);
  }
};
```

### 5. Migration Steps

1. Create new place context and types
2. Add migration code to move place metadata from POIs to places
3. Update components to use place context
4. Remove place metadata handling from POI context
5. Clean up old place metadata from POIs

## Benefits

1. Clear separation between places and POIs
2. Simpler data model - places store their own metadata
3. No race conditions or unnecessary updates
4. Better performance - only update one place instead of multiple POIs
5. Easier to extend place functionality in the future

## Note

This change maintains the existing POI functionality while properly separating place metadata into its own system. POIs will still be associated with places through their placeId, but won't store place metadata anymore.
