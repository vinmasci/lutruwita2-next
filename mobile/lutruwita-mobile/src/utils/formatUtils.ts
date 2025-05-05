/**
 * Format bytes to a human-readable string
 * @param bytes Number of bytes
 * @param decimals Number of decimal places to show
 * @returns Formatted string (e.g. "1.5 MB")
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format a duration in seconds to a human-readable string
 * @param seconds Number of seconds
 * @returns Formatted string (e.g. "1h 30m")
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format a distance in meters to a human-readable string
 * @param meters Distance in meters
 * @param decimals Number of decimal places to show
 * @returns Formatted string (e.g. "1.5 km")
 */
export const formatDistance = (meters: number, decimals: number = 1): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }

  const km = meters / 1000;
  return `${km.toFixed(decimals)} km`;
};

/**
 * Format a date to a human-readable string
 * @param date Date object, ISO string, or undefined
 * @returns Formatted string (e.g. "Jan 1, 2023") or "Unknown date" if undefined
 */
export const formatDate = (date?: Date | string): string => {
  if (!date) return 'Unknown date';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format a percentage value
 * @param value Percentage value (0-100)
 * @param decimals Number of decimal places to show
 * @returns Formatted string (e.g. "42.5%")
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};
