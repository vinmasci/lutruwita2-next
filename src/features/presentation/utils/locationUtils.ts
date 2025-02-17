const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface LocationInfo {
  state: string;
  city: string;
}

const getStartingLocation = async (geojson: any): Promise<LocationInfo> => {
  try {
    // Get the first coordinate from the first route's LineString
    const firstFeature = geojson.features[0];
    if (firstFeature?.geometry?.type === 'LineString') {
      const firstCoordinate = firstFeature.geometry.coordinates[0];
      if (Array.isArray(firstCoordinate) && firstCoordinate.length >= 2) {
        const [longitude, latitude] = firstCoordinate;
        
        // Use Mapbox's reverse geocoding API
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&types=place,region`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch location data');
        }

        const data = await response.json();
        let state = 'UNKNOWN';
        let city = 'UNKNOWN';

        // Find the state (region) and city (place) from the features
        for (const feature of data.features) {
          if (feature.place_type[0] === 'region') {
            // Convert state names to abbreviations
            const stateMap: { [key: string]: string } = {
              'Tasmania': 'TAS',
              'Victoria': 'VIC',
              'New South Wales': 'NSW',
              'Queensland': 'QLD',
              'South Australia': 'SA',
              'Western Australia': 'WA',
              'Northern Territory': 'NT',
              'Australian Capital Territory': 'ACT'
            };
            state = stateMap[feature.text] || feature.text;
          } else if (feature.place_type[0] === 'place') {
            city = feature.text.toUpperCase();
          }
        }

        return { state, city };
      }
    }
  } catch (error) {
    console.error('Error getting location:', error);
  }
  
  return { state: 'UNKNOWN', city: 'UNKNOWN' };
};

export { getStartingLocation };
