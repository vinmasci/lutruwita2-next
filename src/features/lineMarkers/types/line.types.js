// Line marker type definitions
export const LINE_TYPES = {
  'line': { label: 'Line Marker' }
};

// Line marker interface
/**
 * @typedef {Object} LineMarker
 * @property {string} id - Unique identifier for the line marker
 * @property {'line'} type - Type identifier
 * @property {Object} coordinates - Line coordinates
 * @property {[number, number]} coordinates.start - Starting point [lng, lat]
 * @property {[number, number]} coordinates.end - Ending point [lng, lat]
 * @property {string} name - Text label
 * @property {string} description - Optional description text
 * @property {string[]} icons - Array of icon identifiers
 * @property {File[]} photos - Array of photo files
 */

/**
 * @typedef {Object} LineState
 * @property {boolean} isDrawing - Whether a line is currently being drawn
 * @property {[number, number] | null} startPoint - Starting point of the line being drawn
 * @property {[number, number] | null} endPoint - Current end point of the line being drawn
 */

/**
 * @typedef {Object} LineDrawerState
 * @property {boolean} isOpen - Whether the drawer is open
 * @property {string} name - Current name input
 * @property {string} description - Current description input
 * @property {string[]} selectedIcons - Currently selected icons
 * @property {File[]} photos - Currently selected photos
 */
