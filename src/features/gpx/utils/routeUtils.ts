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
