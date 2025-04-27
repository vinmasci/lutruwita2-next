/**
 * Utility functions for climb detection and categorization
 */
import { RouteData } from '../services/routeService';

// Configuration for climb detection
export const CLIMB_CONFIG = {
  MIN_GRADIENT: 0.5, // Minimum gradient to consider as climbing (percent)
  MIN_LENGTH: 1200, // Minimum length for a climb segment (meters)
  SMOOTHING_WINDOW: 20, // Number of points to use for smoothing elevation data
  PEAK_THRESHOLD: 10, // Minimum elevation difference to consider as a peak (meters)
  VALLEY_MERGE_DIST: 20000, // Maximum distance between valleys to merge climbs (meters)
  MIN_DOWNHILL_GRADIENT: -3, // Minimum gradient to consider as significant downhill (percent)
  MIN_DOWNHILL_LENGTH: 1000, // Minimum length for a downhill section to reset climb (meters)
  LOOK_AHEAD_DISTANCE: 10000, // 10km in meters - how far to look ahead for higher elevation points
};

// Category configuration with pastel colors
export const CATEGORY_CONFIG = {
  HC: { minFiets: 8.0, color: '#c27878' }, // Pastel maroon
  CAT1: { minFiets: 6.0, color: '#ff9999' }, // Pastel red (current)
  CAT2: { minFiets: 4.5, color: '#ffcc99' }, // Pastel orange (current)
  CAT3: { minFiets: 3.0, color: '#ffff99' }, // Pastel yellow (current)
  CAT4: { minFiets: 2.0, color: '#99cc99' }, // Pastel green
};

// Gradient color configuration
export const GRADIENT_COLOR_CONFIG = {
  STEEP: { min: 10, color: '#b33939' },    // Maroon for >10%
  HARD: { min: 6, color: '#ff7979' },      // Red for 6-10%
  MODERATE: { min: 3, color: '#ffbe76' },  // Orange for 3-6%
  EASY: { min: 1, color: '#eccc68' },      // Yellow for 1-3%
  FLAT: { min: -100, color: '#99cc99' }    // Green for <1% (including downhill)
};

// Types for climb detection
export interface ElevationPoint {
  distance: number;
  elevation: number;
}

export interface ClimbPoint {
  distance: number;
  elevation: number;
  gradient: number;
}

export interface Climb {
  startPoint: ClimbPoint;
  endPoint: ClimbPoint;
  totalDistance: number;
  elevationGain: number;
  averageGradient: number;
  fietsScore: number;
  category: string;
  color: string;
  roadName?: string | null;
}

interface SteepSection {
  startIdx: number;
  points: ElevationPoint[];
  gradients: number[];
}

/**
 * Calculates FIETS score for a climb
 * FIETS = (Δh/1000) × (Δh/(distance in km × 10))²
 */
export const calculateFietsScore = (elevationGain: number, distanceKm: number): number => {
  const h = elevationGain; // Δh in meters
  return (h / 1000) * Math.pow(h / (distanceKm * 10), 2);
};

/**
 * Determines climb category based on FIETS score
 */
export const determineCategory = (fietsScore: number): { category: string; color: string } => {
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
export const smoothElevationData = (data: ElevationPoint[], windowSize: number): ElevationPoint[] => {
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
export const calculateGradient = (point1: ElevationPoint, point2: ElevationPoint): number => {
  const elevationChange = point2.elevation - point1.elevation;
  const distance = point2.distance - point1.distance;
  return (elevationChange / distance) * 100;
};

/**
 * Checks if two climbs have any overlap
 */
export const checkClimbOverlap = (climb1: Climb, climb2: Climb): boolean => {
  // Get start and end distances for both climbs
  const climb1Start = climb1.startPoint.distance;
  const climb1End = climb1.endPoint.distance;
  const climb2Start = climb2.startPoint.distance;
  const climb2End = climb2.endPoint.distance;
  
  // Check for any overlap
  // Two segments overlap if one starts before the other ends
  return (climb1Start < climb2End && climb2Start < climb1End);
};

/**
 * Removes overlapping climbs, ensuring no overlap between any climbs
 */
export const removeOverlappingClimbs = (climbs: Climb[]): Climb[] => {
  if (climbs.length <= 1) return climbs;
  
  // First sort by FIETS score (highest first) to prioritize more significant climbs
  // If FIETS scores are equal, prioritize by length
  const sortedClimbs = [...climbs].sort((a, b) => {
    if (Math.abs(b.fietsScore - a.fietsScore) > 0.1) {
      return b.fietsScore - a.fietsScore;
    }
    return b.totalDistance - a.totalDistance;
  });
  
  const result: Climb[] = [];
  
  // Process each climb
  for (const climb of sortedClimbs) {
    // Check if this climb overlaps with any climb we've already decided to keep
    const hasOverlap = result.some(existingClimb => 
      checkClimbOverlap(climb, existingClimb)
    );
    
    // If no overlap at all, keep this climb
    if (!hasOverlap) {
      result.push(climb);
    }
  }
  
  return result;
};

/**
 * Detects climbs by identifying sections with consistent steep gradients
 */
export const detectClimbs = (data: ElevationPoint[]): Climb[] => {
  if (data.length < 2)
    return [];
  
  // Smooth the elevation data to reduce noise
  const smoothedData = smoothElevationData(data, CLIMB_CONFIG.SMOOTHING_WINDOW);
  
  // Find steep sections (0.5% or greater)
  const steepSections: SteepSection[] = [];
  let currentSection: SteepSection | null = null;
  
  // Scan through the data to find continuous steep sections
  for (let i = 1; i < smoothedData.length; i++) {
    const gradient = calculateGradient(smoothedData[i-1], smoothedData[i]);
    
    // If we find a steep section
    if (gradient >= CLIMB_CONFIG.MIN_GRADIENT) {
      // If we're not already tracking a section, start a new one
      if (!currentSection) {
        currentSection = {
          startIdx: i-1,
          points: [smoothedData[i-1], smoothedData[i]],
          gradients: [gradient]
        };
      } else {
        // Otherwise add to the current section
        currentSection.points.push(smoothedData[i]);
        currentSection.gradients.push(gradient);
      }
    } 
    // If we're not in a steep section but were tracking one
    else if (currentSection) {
      // If the section is long enough, save it
      const sectionDistance = smoothedData[i-1].distance - smoothedData[currentSection.startIdx].distance;
      if (sectionDistance >= CLIMB_CONFIG.MIN_LENGTH) {
        steepSections.push(currentSection);
      }
      currentSection = null;
    }
  }
  
  // Don't forget to add the last section if we were tracking one
  if (currentSection) {
    const lastIdx = smoothedData.length - 1;
    const sectionDistance = smoothedData[lastIdx].distance - smoothedData[currentSection.startIdx].distance;
    if (sectionDistance >= CLIMB_CONFIG.MIN_LENGTH) {
      steepSections.push(currentSection);
    }
  }
  
  // Merge nearby steep sections if they're part of the same climb
  const mergedSections: SteepSection[] = [];
  for (let i = 0; i < steepSections.length; i++) {
    const currentSection = steepSections[i];
    
    // If this is the first section or we can't merge with the previous one
    if (i === 0) {
      mergedSections.push(currentSection);
      continue;
    }
    
    const prevSection = mergedSections[mergedSections.length - 1];
    const lastPointPrev = prevSection.points[prevSection.points.length - 1];
    const firstPointCurrent = currentSection.points[0];
    
    // Calculate distance between sections
    const distanceBetween = firstPointCurrent.distance - lastPointPrev.distance;
    
    // Only merge if sections are close AND the connecting segment isn't a significant downhill
    if (distanceBetween <= 10000) { // 10km max gap between steep sections
      // Check if there's a significant downhill between sections
      let hasSignificantDownhill = false;
      
      // Find the actual data points between the sections
      const betweenStartIdx = smoothedData.findIndex(p => p.distance >= lastPointPrev.distance);
      const betweenEndIdx = smoothedData.findIndex(p => p.distance >= firstPointCurrent.distance);
      
      if (betweenStartIdx < betweenEndIdx) {
        const betweenPoints = smoothedData.slice(betweenStartIdx, betweenEndIdx + 1);
        
        // Check if there's a significant downhill
        let downhillLength = 0;
        for (let j = 1; j < betweenPoints.length; j++) {
          const gradient = calculateGradient(betweenPoints[j-1], betweenPoints[j]);
          if (gradient <= CLIMB_CONFIG.MIN_DOWNHILL_GRADIENT) {
            downhillLength += betweenPoints[j].distance - betweenPoints[j-1].distance;
            if (downhillLength >= CLIMB_CONFIG.MIN_DOWNHILL_LENGTH) {
              hasSignificantDownhill = true;
              break;
            }
          } else {
            downhillLength = 0;
          }
        }
        
        // If no significant downhill, merge the sections
        if (!hasSignificantDownhill) {
          // Add the points between sections to maintain continuity
          prevSection.points = prevSection.points.concat(betweenPoints.slice(1), currentSection.points.slice(1));
          prevSection.gradients = prevSection.gradients.concat(
            // Calculate gradients for the between points
            betweenPoints.slice(1).map((p, idx) => 
              calculateGradient(betweenPoints[idx], p)
            ),
            currentSection.gradients
          );
          continue;
        }
      }
    }
    
    // If we couldn't merge, add as a new section
    mergedSections.push(currentSection);
  }
  
  // Convert merged sections to climb objects and filter out climbs with average gradient < 1.5%
  const climbs: Climb[] = mergedSections.map(section => {
    const startPoint = section.points[0];
    let endPoint = section.points[section.points.length - 1];
    
    const endPointDistance = endPoint.distance;
    const endPointElevation = endPoint.elevation;
    
    // Find the index of the end point in the smoothed data
    const endPointIdx = smoothedData.findIndex(p => p.distance >= endPointDistance);
    
    if (endPointIdx !== -1 && endPointIdx < smoothedData.length - 1) {
      // Look ahead up to the configured distance
      let highestPoint = endPoint;
      let currentIdx = endPointIdx + 1;
      let significantDownhillFound = false;
      let downhillLength = 0;
      let lastElevation = endPoint.elevation;
      
      while (currentIdx < smoothedData.length && 
             smoothedData[currentIdx].distance <= endPointDistance + CLIMB_CONFIG.LOOK_AHEAD_DISTANCE) {
        const currentPoint = smoothedData[currentIdx];
        
        // Check if we're going downhill
        if (currentPoint.elevation < lastElevation) {
          // Calculate gradient of this downhill section
          const downhillGradient = calculateGradient(
            { distance: smoothedData[currentIdx-1].distance, elevation: lastElevation },
            { distance: currentPoint.distance, elevation: currentPoint.elevation }
          );
          
          // If it's a significant downhill
          if (downhillGradient <= CLIMB_CONFIG.MIN_DOWNHILL_GRADIENT) {
            downhillLength += currentPoint.distance - smoothedData[currentIdx-1].distance;
            
            // If the downhill is long enough, we've found the end of the climb
            if (downhillLength >= CLIMB_CONFIG.MIN_DOWNHILL_LENGTH) {
              significantDownhillFound = true;
              break;
            }
          } else {
            // Reset downhill length if gradient isn't steep enough
            downhillLength = 0;
          }
        } else {
          // Reset downhill length when we start going up again
          downhillLength = 0;
        }
        
        // If we find a higher point, update the highest point
        if (currentPoint.elevation > highestPoint.elevation) {
          highestPoint = currentPoint;
        }
        
        lastElevation = currentPoint.elevation;
        currentIdx++;
      }
      
      // If we found a higher point and didn't hit a significant downhill, use it as the end point
      if (highestPoint.elevation > endPointElevation && !significantDownhillFound) {
        endPoint = highestPoint;
      }
    }
    
    // Calculate climb characteristics
    const elevationGain = endPoint.elevation - startPoint.elevation;
    const totalDistance = endPoint.distance - startPoint.distance;
    const averageGradient = (elevationGain / totalDistance) * 100;
    
    // Calculate FIETS score and determine category
    const distanceKm = totalDistance / 1000;
    const fietsScore = calculateFietsScore(elevationGain, distanceKm);
    const { category, color } = determineCategory(fietsScore);
    
    // Find the original data points for more accurate start/end values
    const startIdx = data.findIndex(p => p.distance >= startPoint.distance);
    const endIdx = data.findIndex(p => p.distance >= endPoint.distance);
    
    // Create climb object
    const climb: Climb = {
      startPoint: {
        distance: data[startIdx].distance,
        elevation: data[startIdx].elevation,
        gradient: averageGradient
      },
      endPoint: {
        distance: data[endIdx].distance,
        elevation: data[endIdx].elevation,
        gradient: averageGradient
      },
      totalDistance,
      elevationGain,
      averageGradient,
      fietsScore,
      category,
      color,
      roadName: null // Initialize roadName as null, will be populated later if needed
    };
    
    return climb;
  });
  
  // Filter out climbs with average gradient less than 1.5%
  const filteredClimbs = climbs.filter(climb => climb.averageGradient >= 1.5);
  
  // Remove overlapping climbs
  const nonOverlappingClimbs = removeOverlappingClimbs(filteredClimbs);
  
  return nonOverlappingClimbs;
};

/**
 * Calculate distance between two points using Haversine formula
 * This accounts for the curvature of the Earth for accurate distance measurements
 */
export const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  
  // Convert to radians
  const toRad = (value: number) => value * Math.PI / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  
  // Haversine formula
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Earth's radius in meters
  const R = 6371e3;
  return R * c;
};

/**
 * Processes route data to extract elevation points with accurate distances
 */
export const extractElevationPoints = (route: RouteData): ElevationPoint[] => {
  if (!route.geojson || !route.geojson.features || route.geojson.features.length === 0) {
    return [];
  }
  
  // Special handling for master route to ensure we get accurate elevation data
  const isMasterRoute = route.routeId === 'master-route';
  
  const coordinates = route.geojson.features[0].geometry.coordinates;
  
  // Check if coordinates have elevation data (3rd element)
  const hasElevationInCoordinates = coordinates.some((coord: any) => 
    Array.isArray(coord) && coord.length > 2 && typeof coord[2] === 'number' && !isNaN(coord[2])
  );
  
  // Check if elevation data exists in properties
  const elevationArray = route.geojson.features[0].properties?.coordinateProperties?.elevation;
  const hasElevationInProperties = Array.isArray(elevationArray) && elevationArray.length > 0;
  
  // Calculate cumulative distances using Haversine formula
  const calculateCumulativeDistances = (coords: any[]): number[] => {
    const cumulativeDistances = [0]; // First point is at distance 0
    let totalDistanceCalculated = 0;
    
    for (let j = 1; j < coords.length; j++) {
      const distance = calculateDistance(
        [coords[j-1][0], coords[j-1][1]], 
        [coords[j][0], coords[j][1]]
      );
      totalDistanceCalculated += distance;
      cumulativeDistances.push(totalDistanceCalculated);
    }
    
    return cumulativeDistances;
  };
  
  // Calculate accurate cumulative distances
  const cumulativeDistances = calculateCumulativeDistances(coordinates);
  
  // If elevation data is in properties, use it even if it doesn't exactly match the number of coordinates
  if (hasElevationInProperties && elevationArray.length > 0) {
    // Create elevation data with accurate distances
    const elevationData: ElevationPoint[] = [];
    
    for (let k = 0; k < elevationArray.length; k++) {
      // Use the actual distance for this point, or interpolate if needed
      // This handles cases where the number of elevation points doesn't match the number of coordinates
      const distanceIndex = Math.min(k, cumulativeDistances.length - 1);
      elevationData.push({
        distance: cumulativeDistances[distanceIndex],
        elevation: elevationArray[k]
      });
    }
    
    return elevationData;
  }
  
  // For master routes and regular routes, always use the actual coordinates with elevation data
  // This ensures we're using the real elevation profile
  return coordinates.map((coord: [number, number, number], index: number) => {
    return {
      distance: cumulativeDistances[index],
      elevation: coord[2] || 0 // Use the elevation from the coordinates
    };
  });
};

/**
 * Calculates gradient for each segment and assigns colors based on gradient percentages
 */
export const calculateSegmentGradients = (elevationPoints: ElevationPoint[]): any[] => {
  if (elevationPoints.length < 2) return [];
  
  const pointsWithGradient = [];
  
  for (let i = 0; i < elevationPoints.length; i++) {
    const point = elevationPoints[i];
    let gradient = 0;
    
    // Calculate gradient with the next point
    if (i < elevationPoints.length - 1) {
      const nextPoint = elevationPoints[i + 1];
      const elevationChange = nextPoint.elevation - point.elevation;
      const distance = nextPoint.distance - point.distance;
      
      // Calculate gradient as percentage (rise/run * 100)
      gradient = distance > 0 ? (elevationChange / distance) * 100 : 0;
    } 
    // For the last point, use the same gradient as the previous segment
    else if (i > 0) {
      gradient = pointsWithGradient[i - 1].gradient;
    }
    
    // Determine color based on gradient
    let gradientColor;
    if (gradient >= GRADIENT_COLOR_CONFIG.STEEP.min) {
      gradientColor = GRADIENT_COLOR_CONFIG.STEEP.color;
    } else if (gradient >= GRADIENT_COLOR_CONFIG.HARD.min) {
      gradientColor = GRADIENT_COLOR_CONFIG.HARD.color;
    } else if (gradient >= GRADIENT_COLOR_CONFIG.MODERATE.min) {
      gradientColor = GRADIENT_COLOR_CONFIG.MODERATE.color;
    } else if (gradient >= GRADIENT_COLOR_CONFIG.EASY.min) {
      gradientColor = GRADIENT_COLOR_CONFIG.EASY.color;
    } else {
      gradientColor = GRADIENT_COLOR_CONFIG.FLAT.color;
    }
    
    pointsWithGradient.push({
      ...point,
      gradient,
      gradientColor
    });
  }
  
  return pointsWithGradient;
};

/**
 * Groups consecutive points with similar gradient categories
 */
export const groupByGradientCategory = (pointsWithGradient: any[]): any[] => {
  if (pointsWithGradient.length === 0) return [];
  
  const sections = [];
  let currentColor = pointsWithGradient[0].gradientColor;
  let startIndex = 0;
  
  for (let i = 1; i < pointsWithGradient.length; i++) {
    if (pointsWithGradient[i].gradientColor !== currentColor) {
      // End the current section and start a new one
      sections.push({
        startIndex,
        endIndex: i - 1,
        color: currentColor,
        gradient: pointsWithGradient[startIndex].gradient
      });
      
      currentColor = pointsWithGradient[i].gradientColor;
      startIndex = i;
    }
  }
  
  // Add the last section
  sections.push({
    startIndex,
    endIndex: pointsWithGradient.length - 1,
    color: currentColor,
    gradient: pointsWithGradient[startIndex].gradient
  });
  
  return sections;
};

/**
 * Assigns climb categories to elevation data points
 */
export const assignClimbCategories = (elevationData: any[], climbs: Climb[]): any[] => {
  // If no climbs, return the original data
  if (climbs.length === 0) return elevationData;
  
  // Create a copy of the elevation data to modify
  const dataWithCategories = [...elevationData];
  
  // Assign a default category (no climb)
  dataWithCategories.forEach(point => {
    point.climbCategory = -1; // -1 means not part of a climb
    point.climbColor = 'transparent';
  });
  
  // For each climb, assign its category to all points within its range
  climbs.forEach((climb, climbIndex) => {
    const startDistance = climb.startPoint.distance;
    const endDistance = climb.endPoint.distance;
    
    dataWithCategories.forEach(point => {
      if (point.distance >= startDistance && point.distance <= endDistance) {
        // Convert category string to number for easier handling in the chart
        let categoryNum = -1;
        switch (climb.category) {
          case 'HC': categoryNum = 0; break;
          case 'CAT1': categoryNum = 1; break;
          case 'CAT2': categoryNum = 2; break;
          case 'CAT3': categoryNum = 3; break;
          case 'CAT4': categoryNum = 4; break;
        }
        
        point.climbCategory = categoryNum;
        point.climbColor = climb.color;
      }
    });
  });
  
  return dataWithCategories;
};
