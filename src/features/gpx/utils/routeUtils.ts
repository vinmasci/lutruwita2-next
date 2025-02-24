export const getRouteDistance = (route: any): number => {
  try {
    if (!route) return 0;
    
    // Check direct statistics
    if (route.statistics?.totalDistance) {
      return route.statistics.totalDistance;
    }
    
    // Check nested route statistics
    if (route.routes?.[0]?.statistics?.totalDistance) {
      return route.routes[0].statistics.totalDistance;
    }
    
    return 0;
  } catch (error) {
    console.error('Error calculating route distance:', error);
    return 0;
  }
};

export const getUnpavedPercentage = (route: any): number => {
  try {
    if (!route || !route.unpavedSections) return 0;
    
    const totalDistance = getRouteDistance(route);
    if (totalDistance === 0) return 0;
    
    // Get total unpaved distance by summing the distances between points in unpaved sections
    const unpavedDistance = route.unpavedSections.reduce((total: number, section: any) => {
      // Get the points from the route's geojson that correspond to this section
      const routeCoords = route.geojson.features[0].geometry.coordinates;
      const sectionCoords = routeCoords.slice(section.startIndex, section.endIndex + 1);
      
      // Calculate distance for this section
      let sectionDistance = 0;
      for (let i = 0; i < sectionCoords.length - 1; i++) {
        const [lon1, lat1] = sectionCoords[i];
        const [lon2, lat2] = sectionCoords[i + 1];
        
        // Use Haversine formula for accurate distance
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                 Math.cos(φ1) * Math.cos(φ2) *
                 Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        sectionDistance += R * c;
      }
      
      return total + sectionDistance;
    }, 0);
    
    return Math.round((unpavedDistance / totalDistance) * 100);
  } catch (error) {
    console.error('Error calculating gravel percentage:', error);
    return 0;
  }
};

export const getElevationGain = (route: any): number => {
  try {
    if (!route) return 0;
    
    // Check direct statistics
    if (route.statistics?.elevationGain) {
      return route.statistics.elevationGain;
    }
    
    // Check nested route statistics
    if (route.routes?.[0]?.statistics?.elevationGain) {
      return route.routes[0].statistics.elevationGain;
    }
    
    return 0;
  } catch (error) {
    console.error('Error calculating elevation gain:', error);
    return 0;
  }
};

export const getElevationLoss = (route: any): number => {
  try {
    if (!route) return 0;
    
    // Check direct statistics
    if (route.statistics?.elevationLoss) {
      return route.statistics.elevationLoss;
    }
    
    // Check nested route statistics
    if (route.routes?.[0]?.statistics?.elevationLoss) {
      return route.routes[0].statistics.elevationLoss;
    }
    
    return 0;
  } catch (error) {
    console.error('Error calculating elevation loss:', error);
    return 0;
  }
};
