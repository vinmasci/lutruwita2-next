/**
 * Icon utilities for POI display
 * 
 * This file contains utility functions for working with POI icons.
 */

import { getPoiCategoryColor } from './poiIconUtils';

/**
 * Get the color for a POI based on its category or custom color
 * 
 * @param category The POI category
 * @param customColor Optional custom color
 * @returns The color to use for the POI
 */
export const getPoiColor = (category: string, customColor?: string): string => {
  return customColor || getPoiCategoryColor(category);
};

/**
 * Get the size for a POI marker
 * 
 * @param customSize Optional custom size
 * @returns The size to use for the POI marker
 */
export const getPoiSize = (customSize?: number): number => {
  return customSize || 8; // Default size
};

/**
 * Get the text offset for a POI label
 * 
 * @returns The text offset as [x, y]
 */
export const getPoiTextOffset = (): [number, number] => {
  return [0, -1.5]; // Position text above the circle
};
