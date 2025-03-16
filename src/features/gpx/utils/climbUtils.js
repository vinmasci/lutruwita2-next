// Configuration for climb detection
const CLIMB_CONFIG = {
    MIN_GRADIENT: 2, // Minimum gradient to consider as climbing (percent)
    MIN_LENGTH: 1200, // Minimum length for a climb segment (meters)
    SMOOTHING_WINDOW: 20, // Number of points to use for smoothing elevation data
    PEAK_THRESHOLD: 10, // Minimum elevation difference to consider as a peak (meters)
    VALLEY_MERGE_DIST: 20000, // Maximum distance between valleys to merge climbs (meters)
    MIN_DOWNHILL_GRADIENT: -1, // Minimum gradient to consider as significant downhill (percent)
    MIN_DOWNHILL_LENGTH: 600, // Minimum length for a downhill section to reset climb (meters)
    LOOK_AHEAD_DISTANCE: 10000, // 10km in meters - how far to look ahead for higher elevation points
};
// Category configuration
const CATEGORY_CONFIG = {
    HC: { minFiets: 8.0, color: '#8B000099' }, // Dark Red with 60% opacity
    CAT1: { minFiets: 6.0, color: '#FF000099' }, // Red with 60% opacity
    CAT2: { minFiets: 4.5, color: '#fa823199' }, // Orange with 60% opacity
    CAT3: { minFiets: 3.0, color: '#f7b73199' }, // Yellow with 60% opacity
    CAT4: { minFiets: 2.0, color: '#228B2299' }, // Forest Green with 60% opacity
};
/**
 * Calculates FIETS score for a climb
 * FIETS = (Δh/1000) × (Δh/(distance in km × 10))²
 */
const calculateFietsScore = (elevationGain, distanceKm) => {
    const h = elevationGain; // Δh in meters
    return (h / 1000) * Math.pow(h / (distanceKm * 10), 2);
};
/**
 * Determines climb category based on FIETS score
 */
const determineCategory = (fietsScore) => {
    if (fietsScore >= CATEGORY_CONFIG.HC.minFiets) {
        return { category: 'HC', color: CATEGORY_CONFIG.HC.color };
    }
    else if (fietsScore >= CATEGORY_CONFIG.CAT1.minFiets) {
        return { category: 'CAT1', color: CATEGORY_CONFIG.CAT1.color };
    }
    else if (fietsScore >= CATEGORY_CONFIG.CAT2.minFiets) {
        return { category: 'CAT2', color: CATEGORY_CONFIG.CAT2.color };
    }
    else if (fietsScore >= CATEGORY_CONFIG.CAT3.minFiets) {
        return { category: 'CAT3', color: CATEGORY_CONFIG.CAT3.color };
    }
    else {
        return { category: 'CAT4', color: CATEGORY_CONFIG.CAT4.color };
    }
};
/**
 * Smooths elevation data using a moving average to reduce noise
 */
const smoothElevationData = (data, windowSize) => {
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
const calculateGradient = (point1, point2) => {
    const elevationChange = point2.elevation - point1.elevation;
    const distance = point2.distance - point1.distance;
    return (elevationChange / distance) * 100;
};

/**
 * Checks if two climbs have any overlap
 */
const checkClimbOverlap = (climb1, climb2) => {
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
const removeOverlappingClimbs = (climbs) => {
    if (climbs.length <= 1) return climbs;
    
    // First sort by FIETS score (highest first) to prioritize more significant climbs
    // If FIETS scores are equal, prioritize by length
    const sortedClimbs = [...climbs].sort((a, b) => {
        if (Math.abs(b.fietsScore - a.fietsScore) > 0.1) {
            return b.fietsScore - a.fietsScore;
        }
        return b.totalDistance - a.totalDistance;
    });
    
    const result = [];
    
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
export const detectClimbs = (data) => {
    if (data.length < 2)
        return [];
    
    // Smooth the elevation data to reduce noise
    const smoothedData = smoothElevationData(data, CLIMB_CONFIG.SMOOTHING_WINDOW);
    
    // Find steep sections (2.5% or greater)
    const steepSections = [];
    let currentSection = null;
    
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
    const mergedSections = [];
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
    const climbs = mergedSections.map(section => {
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
        const climb = {
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
            color
        };
        
        return climb;
    });
    
    // Filter out climbs with average gradient less than 1.5%
    const filteredClimbs = climbs.filter(climb => climb.averageGradient >= 1.5);
    
    // Remove overlapping climbs
    const nonOverlappingClimbs = removeOverlappingClimbs(filteredClimbs);
    
    return nonOverlappingClimbs;
};
