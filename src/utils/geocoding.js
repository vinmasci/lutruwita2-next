/**
 * Utility functions for geocoding and reverse geocoding
 */

// Default location data
const DEFAULT_LOCATION = {
  country: 'Australia',
  state: '',
  lga: ''
};

// Cache for location data to minimize API calls
const locationCache = new Map();

/**
 * Fetches location data (state, LGA) from coordinates using OpenStreetMap Nominatim API
 * 
 * @param {Array} coordinates - [longitude, latitude] array
 * @returns {Promise<Object>} - Object containing country, state and LGA information
 */
export const fetchLocationData = async (coordinates) => {
  try {
    if (!coordinates || coordinates.length < 2) {
      console.error('[geocoding] Invalid coordinates for location lookup:', coordinates);
      return DEFAULT_LOCATION;
    }
    
    const [longitude, latitude] = coordinates;
    
    // Check cache first to avoid unnecessary API calls
    const cacheKey = `${longitude.toFixed(4)},${latitude.toFixed(4)}`;
    if (locationCache.has(cacheKey)) {
      console.log('[geocoding] Using cached location data for', cacheKey);
      return locationCache.get(cacheKey);
    }
    
    // Tasmania coordinates check (rough bounding box) - use local data for Tasmania
    if (latitude >= -44 && latitude <= -40 && longitude >= 144 && longitude <= 149) {
      const tasmaniaData = {
        country: 'Australia',
        state: 'Tasmania',
        lga: determineTasmanianLGA(longitude, latitude)
      };
      
      // Cache the result
      locationCache.set(cacheKey, tasmaniaData);
      return tasmaniaData;
    }
    
    // Use OpenStreetMap Nominatim API for reverse geocoding
    // This is a free service with usage limits (1 request per second)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
    
    console.log('[geocoding] Fetching location data from:', url);
    
    const response = await fetch(url, {
      headers: {
        // Add a user agent as required by Nominatim's usage policy
        'User-Agent': 'Route-Planner/1.0'
      }
    });
    
    if (!response.ok) {
      console.warn(`[geocoding] Nominatim API error: ${response.status} ${response.statusText}`);
      return DEFAULT_LOCATION;
    }
    
    const data = await response.json();
    console.log('[geocoding] Nominatim response:', data);
    
    // Extract state and LGA information from the response
    const locationData = {
      country: data.address?.country || 'Australia',
      state: '',
      lga: ''
    };
    
    if (data.address) {
      // For Australia, the state is usually in state or state_district
      locationData.state = data.address.state || 
                          data.address.state_district || 
                          data.address.region || 
                          '';
      
      // LGA could be in county, municipality, city_district, or similar fields
      locationData.lga = data.address.county || 
                        data.address.municipality || 
                        data.address.city_district || 
                        data.address.district || 
                        data.address.suburb || 
                        '';
    }
    
    console.log('[geocoding] Extracted location data:', locationData);
    
    // Cache the result
    locationCache.set(cacheKey, locationData);
    return locationData;
  } catch (error) {
    console.error('[geocoding] Error fetching location data:', error);
    return DEFAULT_LOCATION;
  }
};

/**
 * Determines location data for a route based on its first coordinates
 * Uses Nominatim API for all locations to get accurate state and LGA data
 * 
 * @param {Object} route - Route object
 * @returns {Promise<Object>} - Location metadata
 */
export const getRouteLocationData = async (route) => {
  // Default location data
  const metadata = {
    country: 'Australia',
    state: '',
    lga: ''
  };
  
  if (!route || !route.geojson || !route.geojson.features || 
      !route.geojson.features[0] || !route.geojson.features[0].geometry) {
    console.warn('[geocoding] Route does not have valid geometry for location lookup');
    return metadata;
  }
  
  const coordinates = route.geojson.features[0].geometry.coordinates;
  if (!coordinates || !coordinates.length) {
    console.warn('[geocoding] Route does not have coordinates for location lookup');
    return metadata;
  }
  
  // Get the first point of the route
  const firstPoint = coordinates[0];
  
  try {
    // Use the Nominatim API to get location data for all routes
    const locationData = await fetchLocationData(firstPoint);
    return locationData;
  } catch (error) {
    console.error('[geocoding] Error getting location data:', error);
    return metadata;
  }
};

/**
 * Determines the Tasmanian LGA based on coordinates
 * This is a simple approximation based on rough geographic boundaries
 * 
 * @param {number} longitude - Longitude coordinate
 * @param {number} latitude - Latitude coordinate
 * @returns {string} - LGA name
 */
function determineTasmanianLGA(longitude, latitude) {
  // Rough approximation of Tasmanian LGAs based on coordinates
  // This is a simplified approach and not accurate for all points
  
  // Hobart area
  if (latitude >= -43.0 && latitude <= -42.7 && longitude >= 147.1 && longitude <= 147.5) {
    return 'Hobart';
  }
  
  // Launceston area
  if (latitude >= -41.6 && latitude <= -41.3 && longitude >= 147.0 && longitude <= 147.3) {
    return 'Launceston';
  }
  
  // West Coast
  if (longitude < 146.0) {
    return 'West Coast';
  }
  
  // East Coast
  if (longitude > 148.0) {
    return 'East Coast';
  }
  
  // Central Highlands
  if (latitude > -42.5 && longitude < 147.0) {
    return 'Central Highlands';
  }
  
  // Southern
  if (latitude < -43.0) {
    return 'Southern Tasmania';
  }
  
  // Default
  return 'Tasmania';
}
