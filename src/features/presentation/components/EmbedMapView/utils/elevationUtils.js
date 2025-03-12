/**
 * Utility functions for elevation calculations
 */

/**
 * Calculate the total elevation gained from a route object
 * @param {Object} route - Route object with elevation data
 * @returns {number} - Total elevation gained in meters
 */
export const calculateElevationGained = (route) => {
    // Check if we have elevation data in the surface
    if (route.surface?.elevationProfile && route.surface.elevationProfile.length > 0) {
        let gained = 0;
        const elevations = route.surface.elevationProfile.map(point => point.elevation);
        
        // Calculate elevation gained
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i-1];
            if (diff > 0) {
                gained += diff;
            }
        }
        
        return gained;
    }
    
    // Check if we have elevation data in the statistics
    if (route.statistics?.elevationGained !== undefined) {
        return route.statistics.elevationGained;
    }
    
    // Default value if no elevation data is found
    return 0;
};

/**
 * Calculate the total elevation lost from a route object
 * @param {Object} route - Route object with elevation data
 * @returns {number} - Total elevation lost in meters
 */
export const calculateElevationLost = (route) => {
    // Check if we have elevation data in the surface
    if (route.surface?.elevationProfile && route.surface.elevationProfile.length > 0) {
        let lost = 0;
        const elevations = route.surface.elevationProfile.map(point => point.elevation);
        
        // Calculate elevation lost
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i-1];
            if (diff < 0) {
                lost += Math.abs(diff);
            }
        }
        
        return lost;
    }
    
    // Check if we have elevation data in the statistics
    if (route.statistics?.elevationLost !== undefined) {
        return route.statistics.elevationLost;
    }
    
    // Default value if no elevation data is found
    return 0;
};

/**
 * Calculate the total elevation gained from an array of elevation values
 * @param {Array} elevationArray - Array of elevation values or objects with elevation property
 * @returns {number} - Total elevation gained in meters
 */
export const calculateElevationFromArray = (elevationArray) => {
    if (!elevationArray || elevationArray.length < 2) {
        return 0;
    }
    
    let gained = 0;
    
    // Handle both array of numbers and array of objects with elevation property
    const elevations = typeof elevationArray[0] === 'object' && elevationArray[0].elevation !== undefined
        ? elevationArray.map(point => point.elevation)
        : elevationArray;
    
    // Calculate elevation gained
    for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i-1];
        if (diff > 0) {
            gained += diff;
        }
    }
    
    return gained;
};

/**
 * Calculate the total elevation lost from an array of elevation values
 * @param {Array} elevationArray - Array of elevation values or objects with elevation property
 * @returns {number} - Total elevation lost in meters
 */
export const calculateElevationLostFromArray = (elevationArray) => {
    if (!elevationArray || elevationArray.length < 2) {
        return 0;
    }
    
    let lost = 0;
    
    // Handle both array of numbers and array of objects with elevation property
    const elevations = typeof elevationArray[0] === 'object' && elevationArray[0].elevation !== undefined
        ? elevationArray.map(point => point.elevation)
        : elevationArray;
    
    // Calculate elevation lost
    for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i-1];
        if (diff < 0) {
            lost += Math.abs(diff);
        }
    }
    
    return lost;
};
