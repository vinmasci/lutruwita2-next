/**
 * Utility functions for geocoding and reverse geocoding using Mapbox API
 */
import mapboxgl from 'mapbox-gl';

/**
 * Get location data for a route (city, state, country)
 * @param {Object} route - Route object with geojson data
 * @returns {Promise<Object>} - Location data object with city, state, country
 */
export const getRouteLocationData = async (route) => {
  if (!route || !route.geojson || !route.geojson.features || !route.geojson.features[0]) {
    console.error('[getRouteLocationData] Invalid route data:', route);
    return { city: null, state: null, country: null };
  }

  try {
    // Get the first coordinate from the route
    const coordinates = route.geojson.features[0].geometry.coordinates;
    if (!coordinates || !coordinates.length) {
      console.error('[getRouteLocationData] No coordinates found in route');
      return { city: null, state: null, country: null };
    }

    // Use the first coordinate for reverse geocoding
    const firstCoord = coordinates[0];
    
    // Get Mapbox access token from the window object (should be set in the app)
    const accessToken = mapboxgl?.accessToken;
    
    if (!accessToken) {
      console.error('[getRouteLocationData] Mapbox access token not found');
      return { city: null, state: null, country: null };
    }
    
    // Construct the Mapbox Geocoding API URL
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${firstCoord[0]},${firstCoord[1]}.json?access_token=${accessToken}&types=place,region,country`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract location data from the response
    let city = null;
    let state = null;
    let country = null;
    
    if (data.features && data.features.length > 0) {
      // Look for features by place type
      const placeFeature = data.features.find(f => f.place_type.includes('place'));
      const regionFeature = data.features.find(f => f.place_type.includes('region'));
      const countryFeature = data.features.find(f => f.place_type.includes('country'));
      
      city = placeFeature ? placeFeature.text : null;
      state = regionFeature ? regionFeature.text : null;
      country = countryFeature ? countryFeature.text : null;
    }
    
    return { city, state, country };
  } catch (error) {
    console.error('[getRouteLocationData] Error:', error);
    return { city: null, state: null, country: null };
  }
};

/**
 * Reverse geocode a coordinate to get the nearest road name
 * @param {Array} coordinates - [longitude, latitude] array
 * @returns {Promise<string|null>} - Road name or null if not found
 */
export const reverseGeocodeForRoad = async (coordinates) => {
  if (!coordinates || coordinates.length !== 2) {
    console.error('[reverseGeocodeForRoad] Invalid coordinates:', coordinates);
    return null;
  }

  const [longitude, latitude] = coordinates;
  
  // Get Mapbox access token from the window object (should be set in the app)
  const accessToken = mapboxgl?.accessToken;
  
  if (!accessToken) {
    console.error('[reverseGeocodeForRoad] Mapbox access token not found');
    return null;
  }
  
  try {
    // Construct the Mapbox Geocoding API URL
    // Documentation: https://docs.mapbox.com/api/search/geocoding/
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${accessToken}&types=address`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();

    // Log the response for debugging
    // console.log('[reverseGeocodeForRoad] Geocoding response:', data);

    // Extract road name from the response
    // The first feature is usually the most relevant
    if (data.features && data.features.length > 0) {
      // Look for features that are likely to be roads
      const roadFeatures = data.features.filter(feature => 
        feature.place_type.includes('address') || 
        feature.place_type.includes('street') ||
        (feature.properties && feature.properties.category === 'road')
      );
      
      if (roadFeatures.length > 0) {
        // Get the road name from the first road feature
        const roadFeature = roadFeatures[0];
        
        // The text property usually contains the road name
        // The place_name property contains the full address
        return roadFeature.text || extractRoadFromPlaceName(roadFeature.place_name);
      }
      
      // If no specific road features found, try to extract from the first feature
      return extractRoadFromPlaceName(data.features[0].place_name);
    }
    
    return null;
  } catch (error) {
    console.error('[reverseGeocodeForRoad] Error:', error);
    return null;
  }
};

/**
 * Extract road name from a place name string
 * @param {string} placeName - Full place name from Mapbox
 * @returns {string|null} - Road name or null
 */
const extractRoadFromPlaceName = (placeName) => {
  if (!placeName) return null;
  
  // Place names are usually formatted as "Road Name, City, State, Country"
  // So we can split by comma and take the first part
  const parts = placeName.split(',');
  
  if (parts.length > 0) {
    return parts[0].trim();
  }
  
  return null;
};
