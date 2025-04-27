/**
 * Utility functions for route data processing
 */
import { RouteData, UnpavedSection } from '../services/routeService';

/**
 * Calculate the unpaved percentage of a route based on unpaved sections
 * @param route The route data containing geojson and unpavedSections
 * @returns The percentage of the route that is unpaved (0-100)
 */
export const calculateUnpavedPercentage = (route: RouteData): number => {
  // If there are no unpaved sections, return 0
  if (!route.unpavedSections || route.unpavedSections.length === 0) {
    return 0;
  }

  // If there's no geojson data, return 0
  if (!route.geojson || !route.geojson.features || route.geojson.features.length === 0) {
    return 0;
  }

  // Get the total number of coordinates in the route
  const coordinates = route.geojson.features[0].geometry.coordinates;
  if (!coordinates || coordinates.length === 0) {
    return 0;
  }

  // Calculate the total number of unpaved points
  let unpavedPointCount = 0;
  route.unpavedSections.forEach(section => {
    // Add 1 to endIndex to include the end point
    unpavedPointCount += (section.endIndex - section.startIndex + 1);
  });

  // Calculate the percentage
  const totalPoints = coordinates.length;
  const unpavedPercentage = (unpavedPointCount / totalPoints) * 100;

  // Round to nearest integer
  return Math.round(unpavedPercentage);
};
