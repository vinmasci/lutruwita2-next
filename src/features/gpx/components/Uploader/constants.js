export const PRESET_COLORS = [
  '#ee5253', // Default red (keep first)
  '#f44336', // Red
  '#e91e63', // Pink
  '#d81b60', // Pink darker
  '#9c27b0', // Purple
  '#8e24aa', // Purple darker
  '#673ab7', // Deep Purple
  '#5e35b1', // Deep Purple darker
  '#3f51b5', // Indigo
  '#3949ab', // Indigo darker
  '#2196f3', // Blue
  '#1e88e5', // Blue darker
  '#03a9f4', // Light Blue
  '#039be5', // Light Blue darker
  '#00bcd4', // Cyan
  '#00acc1', // Cyan darker
  '#009688', // Teal
  '#00897b', // Teal darker
  '#4caf50', // Green
  '#43a047', // Green darker
  '#8bc34a', // Light Green
  '#7cb342', // Light Green darker
  '#cddc39', // Lime
  '#c0ca33', // Lime darker
  '#ffeb3b', // Yellow
  '#fdd835', // Yellow darker
  '#ffc107', // Amber
  '#ffb300', // Amber darker
  '#ff9800', // Orange
  '#fb8c00', // Orange darker
  '#ff5722', // Deep Orange
  '#f4511e'  // Deep Orange darker
];

export const validateHexColor = (color) => {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
};
