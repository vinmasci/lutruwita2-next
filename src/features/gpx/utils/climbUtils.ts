interface ClimbPoint {
  distance: number;  // Distance from start in meters
  elevation: number; // Elevation in meters
  gradient: number;  // Gradient as percentage
}

interface Climb {
  startPoint: ClimbPoint;
  endPoint: ClimbPoint;
  totalDistance: number;    // Distance in meters
  averageGradient: number;  // Average gradient as percentage
  elevationGain: number;    // Total elevation gain in meters
}

/**
 * Detects climbs in a GPX route based on the following criteria:
 * - A climb starts when we find a 1km section with average gradient >= 3%
 * - The climb continues until we find a 1km section with average gradient < 3%
 * - The climb can be any length (3km, 4km, 20km etc) as long as it maintains the gradient
 */
export const detectClimbs = (data: { distance: number; elevation: number }[]): Climb[] => {
  console.log('[ClimbUtils] Starting climb detection with data points:', data.length);
  const climbs: Climb[] = [];
  let currentIndex = 0;
  let inClimb = false;
  let climbStartIndex = 0;

  while (currentIndex < data.length) {
    const gradient = calculateRollingGradient(data, currentIndex);
    
    if (gradient === null) {
      break; // Not enough distance left for a 1km window
    }

    if (!inClimb && gradient >= 3) {
      // Start of a new climb
      inClimb = true;
      climbStartIndex = currentIndex;
      console.log(`[ClimbUtils] Potential climb start at ${(data[currentIndex].distance/1000).toFixed(1)}km with ${gradient.toFixed(1)}%`);
    } else if (inClimb && gradient < 3) {
      // Potential end of climb
      // Create climb object
      const climb: Climb = {
        startPoint: {
          distance: data[climbStartIndex].distance,
          elevation: data[climbStartIndex].elevation,
          gradient: gradient
        },
        endPoint: {
          distance: data[currentIndex].distance,
          elevation: data[currentIndex].elevation,
          gradient: gradient
        },
        totalDistance: data[currentIndex].distance - data[climbStartIndex].distance,
        elevationGain: data[currentIndex].elevation - data[climbStartIndex].elevation,
        averageGradient: ((data[currentIndex].elevation - data[climbStartIndex].elevation) / 
                         (data[currentIndex].distance - data[climbStartIndex].distance)) * 100
      };

      // Only add if it's at least 1km long
      if (climb.totalDistance >= 1000) {
        console.log(`[ClimbUtils] Found climb: ${(climb.totalDistance/1000).toFixed(1)}km at ${climb.averageGradient.toFixed(1)}%`);
        climbs.push(climb);
      }

      inClimb = false;
    }

    currentIndex++;
  }

  // Handle case where we're still in a climb at the end
  if (inClimb) {
    const climb: Climb = {
      startPoint: {
        distance: data[climbStartIndex].distance,
        elevation: data[climbStartIndex].elevation,
        gradient: 0
      },
      endPoint: {
        distance: data[data.length - 1].distance,
        elevation: data[data.length - 1].elevation,
        gradient: 0
      },
      totalDistance: data[data.length - 1].distance - data[climbStartIndex].distance,
      elevationGain: data[data.length - 1].elevation - data[climbStartIndex].elevation,
      averageGradient: ((data[data.length - 1].elevation - data[climbStartIndex].elevation) / 
                       (data[data.length - 1].distance - data[climbStartIndex].distance)) * 100
    };

    if (climb.totalDistance >= 1000) {
      console.log(`[ClimbUtils] Found climb at end: ${(climb.totalDistance/1000).toFixed(1)}km at ${climb.averageGradient.toFixed(1)}%`);
      climbs.push(climb);
    }
  }

  return climbs;
};

/**
 * Calculates a rolling average gradient over a 1km window
 * Used to determine if we're in a climb or if a climb has ended
 */
const calculateRollingGradient = (
  data: { distance: number; elevation: number }[],
  startIndex: number
): number | null => {
  // Look ahead 1km from the start index
  const targetDistance = data[startIndex].distance + 1000; // 1km = 1000m
  let endIndex = startIndex;
  
  // Find the point that's approximately 1km ahead
  while (endIndex < data.length - 1 && data[endIndex].distance < targetDistance) {
    endIndex++;
  }

  // If we don't have enough distance for 1km, return null
  if (endIndex === startIndex || data[endIndex].distance - data[startIndex].distance < 900) {
    return null;
  }

  // Calculate total elevation gain and distance
  const elevationChange = data[endIndex].elevation - data[startIndex].elevation;
  const distanceChange = data[endIndex].distance - data[startIndex].distance;

  // Calculate gradient as a percentage
  const gradient = (elevationChange / distanceChange) * 100;

  console.log(`[ClimbUtils] Rolling gradient from ${startIndex} to ${endIndex}: ${gradient.toFixed(1)}% (${(distanceChange/1000).toFixed(1)}km)`);
  
  return gradient;
};
