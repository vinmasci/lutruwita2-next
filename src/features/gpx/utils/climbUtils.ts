export interface ClimbPoint {
  distance: number;  // Distance from start in meters
  elevation: number; // Elevation in meters
  gradient: number;  // Gradient as percentage
}

export type ClimbCategory = 'HC' | 'CAT1' | 'CAT2' | 'CAT3' | 'CAT4';

export interface Climb {
  startPoint: ClimbPoint;
  endPoint: ClimbPoint;
  totalDistance: number;    // Distance in meters
  averageGradient: number;  // Average gradient as percentage
  elevationGain: number;    // Total elevation gain in meters
  fietsScore: number;       // FIETS score for climb difficulty
  category: ClimbCategory;  // Climb category based on FIETS score
  color: string;           // Color code for the category
}

// Configuration for climb detection
const CLIMB_CONFIG = {
  MIN_GRADIENT: 3,           // Minimum gradient to consider as climbing (percent)
  MIN_LENGTH: 1000,         // Minimum length for a climb segment (meters)
  SMOOTHING_WINDOW: 10,      // Number of points to use for smoothing elevation data
  PEAK_THRESHOLD: 50,       // Minimum elevation difference to consider as a peak (meters)
  VALLEY_MERGE_DIST: 20000,  // Maximum distance between valleys to merge climbs (meters)
};

// Category configuration
const CATEGORY_CONFIG = {
  HC: { minFiets: 8.0, color: '#8B0000' },   // Dark Red
  CAT1: { minFiets: 6.0, color: '#FF0000' }, // Red
  CAT2: { minFiets: 4.5, color: '#fa8231' }, // Orange
  CAT3: { minFiets: 3.0, color: '#f7b731' }, // Yellow
  CAT4: { minFiets: 2.0, color: '#228B22' }, // Forest Green
};

/**
 * Calculates FIETS score for a climb
 * FIETS = (Δh/1000) × (Δh/(distance in km × 10))²
 */
const calculateFietsScore = (elevationGain: number, distanceKm: number): number => {
  const h = elevationGain; // Δh in meters
  return (h / 1000) * Math.pow(h / (distanceKm * 10), 2);
};

/**
 * Determines climb category based on FIETS score
 */
const determineCategory = (fietsScore: number): { category: ClimbCategory; color: string } => {
  if (fietsScore >= CATEGORY_CONFIG.HC.minFiets) {
    return { category: 'HC', color: CATEGORY_CONFIG.HC.color };
  } else if (fietsScore >= CATEGORY_CONFIG.CAT1.minFiets) {
    return { category: 'CAT1', color: CATEGORY_CONFIG.CAT1.color };
  } else if (fietsScore >= CATEGORY_CONFIG.CAT2.minFiets) {
    return { category: 'CAT2', color: CATEGORY_CONFIG.CAT2.color };
  } else if (fietsScore >= CATEGORY_CONFIG.CAT3.minFiets) {
    return { category: 'CAT3', color: CATEGORY_CONFIG.CAT3.color };
  } else {
    return { category: 'CAT4', color: CATEGORY_CONFIG.CAT4.color };
  }
};

/**
 * Smooths elevation data using a moving average to reduce noise
 */
const smoothElevationData = (data: { distance: number; elevation: number }[], windowSize: number) => {
  return data.map((point, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(data.length, index + Math.floor(windowSize / 2) + 1);
    const window = data.slice(start, end);
    const avgElevation = window.reduce((sum, p) => sum + p.elevation, 0) / window.length;
    return {
      distance: point.distance,
      elevation: avgElevation
    };
  });
};

/**
 * Calculates gradient between two points
 */
const calculateGradient = (point1: { distance: number; elevation: number }, 
                         point2: { distance: number; elevation: number }): number => {
  const elevationChange = point2.elevation - point1.elevation;
  const distance = point2.distance - point1.distance;
  return (elevationChange / distance) * 100;
};

/**
 * Detects climbs by identifying significant elevation gains between valleys
 */
export const detectClimbs = (data: { distance: number; elevation: number }[]): Climb[] => {
  if (data.length < 2) return [];
  
  console.log('[ClimbUtils] Starting climb detection with data points:', data.length);
  
  // Smooth the elevation data to reduce noise
  const smoothedData = smoothElevationData(data, CLIMB_CONFIG.SMOOTHING_WINDOW);
  
  // Find valleys (potential climb start/end points)
  const valleys: number[] = [0]; // Always include start point
  const peaks: number[] = [];
  
  for (let i = 1; i < smoothedData.length - 1; i++) {
    const prev = smoothedData[i - 1].elevation;
    const curr = smoothedData[i].elevation;
    const next = smoothedData[i + 1].elevation;
    
    // Identify local minimums (valleys)
    if (prev > curr && curr <= next) {
      valleys.push(i);
    }
    
    // Identify local maximums (peaks)
    if (prev < curr && curr >= next) {
      peaks.push(i);
    }
  }
  
  valleys.push(smoothedData.length - 1); // Always include end point
  
  // Process valleys to identify climbs
  const climbs: Climb[] = [];
  
  for (let i = 0; i < valleys.length - 1; i++) {
    const startIdx = valleys[i];
    const endIdx = valleys[i + 1];
    const segment = smoothedData.slice(startIdx, endIdx + 1);
    
    // Find highest point in segment
    let maxElevation = -Infinity;
    let maxElevationIdx = startIdx;
    
    for (let j = 0; j < segment.length; j++) {
      if (segment[j].elevation > maxElevation) {
        maxElevation = segment[j].elevation;
        maxElevationIdx = startIdx + j;
      }
    }
    
    // Calculate climb characteristics
    const elevationGain = maxElevation - smoothedData[startIdx].elevation;
    const totalDistance = smoothedData[maxElevationIdx].distance - smoothedData[startIdx].distance;
    const averageGradient = (elevationGain / totalDistance) * 100;
    
    // Check if this segment qualifies as a climb
    if (elevationGain >= CLIMB_CONFIG.PEAK_THRESHOLD && 
        totalDistance >= CLIMB_CONFIG.MIN_LENGTH && 
        averageGradient >= CLIMB_CONFIG.MIN_GRADIENT) {
      
      // Calculate FIETS score and determine category
      const distanceKm = totalDistance / 1000;
      const fietsScore = calculateFietsScore(elevationGain, distanceKm);
      const { category, color } = determineCategory(fietsScore);
      
      // Create climb object
      const climb: Climb = {
        startPoint: {
          distance: data[startIdx].distance,
          elevation: data[startIdx].elevation,
          gradient: averageGradient
        },
        endPoint: {
          distance: data[maxElevationIdx].distance,
          elevation: data[maxElevationIdx].elevation,
          gradient: averageGradient
        },
        totalDistance,
        elevationGain,
        averageGradient,
        fietsScore,
        category,
        color
      };
      
      // Check if we should merge with previous climb
      if (climbs.length > 0) {
        const prevClimb = climbs[climbs.length - 1];
        const distanceBetweenClimbs = climb.startPoint.distance - prevClimb.endPoint.distance;
        
        if (distanceBetweenClimbs <= CLIMB_CONFIG.VALLEY_MERGE_DIST) {
          // Merge climbs by updating end point of previous climb
          prevClimb.endPoint = climb.endPoint;
          prevClimb.totalDistance = prevClimb.endPoint.distance - prevClimb.startPoint.distance;
          prevClimb.elevationGain = prevClimb.endPoint.elevation - prevClimb.startPoint.elevation;
          prevClimb.averageGradient = (prevClimb.elevationGain / prevClimb.totalDistance) * 100;
          
          // Recalculate FIETS score and category for merged climb
          const mergedDistanceKm = prevClimb.totalDistance / 1000;
          prevClimb.fietsScore = calculateFietsScore(prevClimb.elevationGain, mergedDistanceKm);
          const { category, color } = determineCategory(prevClimb.fietsScore);
          prevClimb.category = category;
          prevClimb.color = color;
          
          console.log(`[ClimbUtils] Merged climb with previous: ${mergedDistanceKm.toFixed(1)}km at ${prevClimb.averageGradient.toFixed(1)}% (${prevClimb.category})`);
          continue;
        }
      }
      
      console.log(`[ClimbUtils] Found climb: ${(totalDistance/1000).toFixed(1)}km at ${averageGradient.toFixed(1)}% (${category})`);
      climbs.push(climb);
    }
  }
  
  return climbs;
};
