/**
 * Utility functions for handling map coordinates
 */

/**
 * Ensures coordinates are in the correct [longitude, latitude] order for Mapbox
 * 
 * This function detects if coordinates appear to be in the wrong order and fixes them.
 * It uses the fact that:
 * - Longitude ranges from -180 to 180
 * - Latitude ranges from -90 to 90
 * - Tasmania is around [146, -41] (longitude, latitude)
 * 
 * @param coords Coordinates that might be in the wrong order
 * @returns Coordinates in the correct [longitude, latitude] order
 */
export const ensureCorrectCoordinateOrder = (coords: [number, number]): [number, number] => {
  // If first value is negative and in the range of latitudes (-90 to 90)
  // and second value is positive and in the range of longitudes (0 to 180)
  // then they're likely reversed
  if (coords[0] < 0 && coords[0] > -90 && coords[1] > 0 && coords[1] < 180) {
    console.log(`[coordinateUtils] Detected reversed coordinates: [${coords[0]}, ${coords[1]}], swapping to [${coords[1]}, ${coords[0]}]`);
    return [coords[1], coords[0]]; // Swap them
  }
  
  // Additional check for Tasmania-specific coordinates
  // If the coordinates are nowhere near Tasmania, they might be reversed
  const tasmaniaLongitude = 146; // Approximate
  const tasmaniaLatitude = -41; // Approximate
  
  // Check if the coordinates are far from Tasmania
  const longitudeDiff = Math.abs(coords[0] - tasmaniaLongitude);
  const latitudeDiff = Math.abs(coords[1] - tasmaniaLatitude);
  
  // If the coordinates are far from Tasmania but would be close if reversed
  const reversedLongitudeDiff = Math.abs(coords[1] - tasmaniaLongitude);
  const reversedLatitudeDiff = Math.abs(coords[0] - tasmaniaLatitude);
  
  if (longitudeDiff > 50 && latitudeDiff > 20 && 
      reversedLongitudeDiff < 20 && reversedLatitudeDiff < 20) {
    console.log(`[coordinateUtils] Coordinates [${coords[0]}, ${coords[1]}] are far from Tasmania, swapping to [${coords[1]}, ${coords[0]}]`);
    return [coords[1], coords[0]]; // Swap them
  }
  
  return coords; // Otherwise return as is
};

/**
 * Ensures a bounding box is in the correct format for Mapbox
 * 
 * @param boundingBox Bounding box that might need correction
 * @returns Corrected bounding box
 */
export const ensureCorrectBoundingBox = (
  boundingBox: [[number, number], [number, number]]
): [[number, number], [number, number]] => {
  return [
    ensureCorrectCoordinateOrder(boundingBox[0]),
    ensureCorrectCoordinateOrder(boundingBox[1])
  ];
};
