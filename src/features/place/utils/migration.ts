import { Place } from '../types/place.types';
import { PlaceNamePOI, POIType } from '../../poi/types/poi.types';

const STORAGE_KEY = 'lutruwita2_places';

/**
 * Migrates place metadata from POIs to the new place storage system.
 * This is a one-time migration to move place descriptions and photos
 * from the POI system to the dedicated place storage.
 */
export const migratePlaceMetadata = () => {
  // Get existing POIs
  const poiData = localStorage.getItem('lutruwita2_pois');
  if (!poiData) return;

  try {
    const pois = JSON.parse(poiData) as POIType[];
    
    // Group POIs by placeId
    const placeGroups = pois.reduce((acc: Record<string, PlaceNamePOI[]>, poi: POIType) => {
      if (poi.type === 'place' && 'placeId' in poi) {
        const placePOI = poi as PlaceNamePOI;
        if (!acc[placePOI.placeId]) {
          acc[placePOI.placeId] = [];
        }
        acc[placePOI.placeId].push(placePOI);
      }
      return acc;
    }, {});

    // Create place entries from POI metadata
    const places: Record<string, Place> = {};
    Object.entries(placeGroups).forEach(([placeId, placePOIs]) => {
      // Use the first POI's metadata since they should all be the same
      const firstPOI = placePOIs[0];
      places[placeId] = {
        id: placeId,
        name: firstPOI.name,
        description: firstPOI.description,
        photos: firstPOI.photos || [],
        coordinates: [firstPOI.position.lng, firstPOI.position.lat],
        updatedAt: firstPOI.updatedAt
      };
    });

    // Save places to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));

    // Remove metadata from POIs
    const updatedPOIs = pois.map((poi: POIType) => {
      if (poi.type === 'place' && 'placeId' in poi) {
        const placePOI = poi as PlaceNamePOI;
        // Keep only the essential POI data, remove metadata
        const { description, photos, ...essentialData } = placePOI;
        return essentialData;
      }
      return poi;
    });

    // Save updated POIs
    localStorage.setItem('lutruwita2_pois', JSON.stringify(updatedPOIs));

    console.log('[Migration] Successfully migrated place metadata');
    return true;
  } catch (error) {
    console.error('[Migration] Failed to migrate place metadata:', error);
    return false;
  }
};
