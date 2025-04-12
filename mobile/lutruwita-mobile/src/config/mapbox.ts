/**
 * Mapbox configuration
 * 
 * This file contains configuration settings for Mapbox GL Native.
 * For production, the access token should be stored in a secure way
 * (e.g., environment variables, .env file, or a secure storage solution).
 */

// Mapbox access token
// Using the token from the .env file
export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoidmlubWFzY2kiLCJhIjoiY20xY3B1ZmdzMHp5eDJwcHBtMmptOG8zOSJ9.Ayn_YEjOCCqujIYhY9PiiA';

// Default map center (Tasmania)
export const DEFAULT_CENTER: [number, number] = [146.8087, -41.4419];

// Default zoom level
export const DEFAULT_ZOOM = 7;

// Map style URLs
export const MAP_STYLES = {
  STREET: 'mapbox://styles/mapbox/streets-v11',
  OUTDOORS: 'mapbox://styles/mapbox/outdoors-v11',
  SATELLITE: 'mapbox://styles/mapbox/satellite-v9',
  SATELLITE_STREETS: 'mapbox://styles/mapbox/satellite-streets-v11',
  DARK: 'mapbox://styles/mapbox/dark-v10',
  LIGHT: 'mapbox://styles/mapbox/light-v10',
};

// Map configuration
export const MAP_CONFIG = {
  // Enable user location tracking
  enableUserLocation: true,
  
  // Enable compass
  enableCompass: true,
  
  // Enable attribution
  enableAttribution: false,
  
  // Enable logo
  enableLogo: false,
  
  // Animation duration for camera movements (in milliseconds)
  animationDuration: 1000,
};
