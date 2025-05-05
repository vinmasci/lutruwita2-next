/**
 * Utility functions for unit conversions and formatting
 */

/**
 * Convert meters to kilometers and format for display
 * @param meters Distance in meters
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted string with km unit
 */
export const formatDistanceMetric = (meters: number, decimals: number = 0): string => {
  const km = meters / 1000;
  return `${km.toFixed(decimals)} km`;
};

/**
 * Convert meters to miles and format for display
 * @param meters Distance in meters
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string with mi unit
 */
export const formatDistanceImperial = (meters: number, decimals: number = 2): string => {
  const miles = meters / 1609.34;
  return `${miles.toFixed(decimals)} mi`;
};

/**
 * Format elevation in meters for display
 * @param meters Elevation in meters
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted string with m unit
 */
export const formatElevationMetric = (meters: number, decimals: number = 0): string => {
  return `${meters.toFixed(decimals)} m`;
};

/**
 * Format a number with commas for thousands
 * @param num Number to format
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted string with commas
 */
export const formatNumberWithCommas = (num: number, decimals: number = 0): string => {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * Convert meters to feet and format for display
 * @param meters Elevation in meters
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted string with ft unit
 */
export const formatElevationImperial = (meters: number, decimals: number = 0): string => {
  const feet = meters * 3.28084;
  return `${feet.toFixed(decimals)} ft`;
};

/**
 * Convert feet to meters
 * @param feet Elevation in feet
 * @returns Elevation in meters
 */
export const feetToMeters = (feet: number): number => {
  return feet / 3.28084;
};

/**
 * Convert meters to feet
 * @param meters Elevation in meters
 * @returns Elevation in feet
 */
export const metersToFeet = (meters: number): number => {
  return meters * 3.28084;
};
