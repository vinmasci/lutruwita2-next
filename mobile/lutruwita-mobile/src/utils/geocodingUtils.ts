/**
 * Utility functions for geocoding and reverse geocoding
 */

/**
 * Abbreviate Australian state names
 * @param state Full state name
 * @returns Abbreviated state name
 */
const abbreviateState = (state: string): string => {
  const stateMap: Record<string, string> = {
    'Victoria': 'VIC',
    'New South Wales': 'NSW',
    'Queensland': 'QLD',
    'South Australia': 'SA',
    'Western Australia': 'WA',
    'Tasmania': 'TAS',
    'Northern Territory': 'NT',
    'Australian Capital Territory': 'ACT'
  };
  
  return stateMap[state] || state;
};

/**
 * Get a location name from coordinates using reverse geocoding
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns A string with the location name or null if not found
 */
export const getLocationName = async (latitude: number, longitude: number): Promise<string | null> => {
  try {
    // Use OpenStreetMap Nominatim API for reverse geocoding
    // Using zoom=18 for more detailed results (building/street level)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'LutruwitaApp/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }

    const data = await response.json();
    
    // Extract the most relevant name from the response
    if (data.address) {
      // Try to get the city/town and combine with state for more specific location
      const city = data.address.city || data.address.town || data.address.village || data.address.suburb;
      const state = data.address.state ? abbreviateState(data.address.state) : null;
      
      if (city && state) {
        return `${city}, ${state}`;
      } else if (city) {
        return city;
      } else if (data.address.county) {
        return state ? `${data.address.county}, ${state}`.trim() : data.address.county;
      } else if (state) {
        return state;
      }
    }
    
    // If we couldn't get a specific location, use the display name
    if (data.display_name) {
      const parts = data.display_name.split(',');
      return parts[0].trim();
    }
    
    return null;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return null;
  }
};
