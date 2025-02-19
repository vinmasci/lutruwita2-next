const STORAGE_KEY = 'lutruwita2_places';
/**
 * Migrates place metadata from POIs to the new place storage system.
 * This is a one-time migration to move place descriptions and photos
 * from the POI system to the dedicated place storage.
 */
export const migratePlaceMetadata = () => {
    // Check if places data already exists
    const existingPlaces = localStorage.getItem(STORAGE_KEY);
    if (existingPlaces) {
        console.log('[Migration] Places data already exists, skipping migration');
        return true;
    }
    // Get existing POIs
    const poiData = localStorage.getItem('lutruwita2_pois');
    if (!poiData) {
        console.log('[Migration] No POIs data found, skipping migration');
        return true;
    }
    try {
        const storedData = JSON.parse(poiData);
        // Handle the new storage format where POIs are split into draggable and places arrays
        if (!storedData || typeof storedData !== 'object') {
            console.error('[Migration] Invalid POIs data format');
            return false;
        }
        // Combine both arrays into a single array of POIs
        const pois = [
            ...(Array.isArray(storedData.draggable) ? storedData.draggable : []),
            ...(Array.isArray(storedData.places) ? storedData.places : [])
        ];
        // Group POIs by placeId
        const placeGroups = pois.reduce((acc, poi) => {
            if (poi.type === 'place' && 'placeId' in poi) {
                const placePOI = poi;
                if (!acc[placePOI.placeId]) {
                    acc[placePOI.placeId] = [];
                }
                acc[placePOI.placeId].push(placePOI);
            }
            return acc;
        }, {});
        // Create place entries from POI metadata
        const places = {};
        Object.entries(placeGroups).forEach(([placeId, placePOIs]) => {
            // Use the first POI's metadata since they should all be the same
            const firstPOI = placePOIs[0];
            places[placeId] = {
                id: placeId,
                name: firstPOI.name,
                description: firstPOI.description,
                photos: firstPOI.photos || [],
                coordinates: [firstPOI.position.lng, firstPOI.position.lat]
            };
        });
        // Save places to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
        // Remove metadata from POIs
        const updatedPOIs = pois.map((poi) => {
            if (poi.type === 'place' && 'placeId' in poi) {
                const placePOI = poi;
                // Keep only the essential POI data, remove metadata
                const { description, photos, ...essentialData } = placePOI;
                return essentialData;
            }
            return poi;
        });
        // Save updated POIs in the correct format
        const updatedStoredData = {
            draggable: updatedPOIs.filter(poi => poi.type === 'draggable'),
            places: updatedPOIs.filter(poi => poi.type === 'place')
        };
        localStorage.setItem('lutruwita2_pois', JSON.stringify(updatedStoredData));
        console.log('[Migration] Successfully migrated place metadata');
        return true;
    }
    catch (error) {
        console.error('[Migration] Failed to migrate place metadata:', error);
        return false;
    }
};
