/**
 * GPX Parser module for serverless environment
 * Provides functionality to parse GPX files and extract route data
 */

import { DOMParser } from 'xmldom';

/**
 * Parse a GPX file and extract route data
 * @param {string} gpxContent - The GPX file content as a string
 * @returns {Promise<Object>} - Parsed route data
 */
export async function parseGPX(gpxContent) {
  try {
    // Parse the XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
    
    // Extract track points
    const trackPoints = extractTrackPoints(xmlDoc);
    
    // Extract metadata
    const metadata = extractMetadata(xmlDoc);
    
    // Create GeoJSON
    const geojson = createGeoJSON(trackPoints);
    
    // Return the parsed data
    return {
      name: metadata.name || 'Unnamed Route',
      description: metadata.description || '',
      points: trackPoints.map(tp => [tp.lon, tp.lat, tp.ele]),
      geojson,
      metadata
    };
  } catch (error) {
    console.error('GPX parsing error:', error);
    throw new Error(`Failed to parse GPX file: ${error.message}`);
  }
}

/**
 * Extract track points from GPX XML document
 * @param {Document} xmlDoc - The parsed XML document
 * @returns {Array} - Array of track points with lat, lon, ele
 */
function extractTrackPoints(xmlDoc) {
  const trackPoints = [];
  
  // Get all track points
  const trkptNodes = xmlDoc.getElementsByTagName('trkpt');
  
  for (let i = 0; i < trkptNodes.length; i++) {
    const trkpt = trkptNodes[i];
    const lat = parseFloat(trkpt.getAttribute('lat'));
    const lon = parseFloat(trkpt.getAttribute('lon'));
    
    // Get elevation
    let ele = 0;
    const eleNodes = trkpt.getElementsByTagName('ele');
    if (eleNodes.length > 0) {
      ele = parseFloat(eleNodes[0].textContent);
    }
    
    // Get time if available
    let time = null;
    const timeNodes = trkpt.getElementsByTagName('time');
    if (timeNodes.length > 0) {
      time = new Date(timeNodes[0].textContent).toISOString();
    }
    
    trackPoints.push({ lat, lon, ele, time });
  }
  
  return trackPoints;
}

/**
 * Extract metadata from GPX XML document
 * @param {Document} xmlDoc - The parsed XML document
 * @returns {Object} - Metadata object
 */
function extractMetadata(xmlDoc) {
  const metadata = {
    name: '',
    description: '',
    author: '',
    time: null
  };
  
  // Get name
  const nameNodes = xmlDoc.getElementsByTagName('name');
  if (nameNodes.length > 0) {
    metadata.name = nameNodes[0].textContent;
  }
  
  // Get description
  const descNodes = xmlDoc.getElementsByTagName('desc');
  if (descNodes.length > 0) {
    metadata.description = descNodes[0].textContent;
  }
  
  // Get author
  const authorNodes = xmlDoc.getElementsByTagName('author');
  if (authorNodes.length > 0) {
    metadata.author = authorNodes[0].textContent;
  }
  
  // Get time
  const timeNodes = xmlDoc.getElementsByTagName('time');
  if (timeNodes.length > 0) {
    metadata.time = new Date(timeNodes[0].textContent).toISOString();
  }
  
  return metadata;
}

/**
 * Create GeoJSON from track points
 * @param {Array} trackPoints - Array of track points
 * @returns {Object} - GeoJSON object
 */
function createGeoJSON(trackPoints) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: trackPoints.map(tp => [tp.lon, tp.lat, tp.ele])
        }
      }
    ]
  };
}
