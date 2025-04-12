/**
 * Color definitions for the Lutruwita Mobile app
 * Based on the web app's color scheme with light/dark variants
 */

export const darkColors = {
  primary: '#ee5253',
  background: '#121212',
  surface: '#1e1e1e',
  card: '#1e1e1e',
  text: '#ffffff',
  border: '#2a2a2a',
  notification: '#ee5253',
  accent: '#ee5253',
  hover: '#2a2a2a',
  error: '#ee5253',
  success: '#28a745',
  warning: '#ffc107',
  info: '#0066cc',
  disabled: '#666666',
  placeholder: '#999999',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  elevation: {
    level1: '#1e1e1e',
    level2: '#222222',
    level3: '#272727',
    level4: '#2a2a2a',
    level5: '#2d2d2d',
  },
};

export const lightColors = {
  primary: '#ee5253',
  background: '#f5f5f5',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#121212',
  border: '#e0e0e0',
  notification: '#ee5253',
  accent: '#ee5253',
  hover: '#f0f0f0',
  error: '#ee5253',
  success: '#28a745',
  warning: '#ffc107',
  info: '#0066cc',
  disabled: '#cccccc',
  placeholder: '#999999',
  backdrop: 'rgba(0, 0, 0, 0.3)',
  elevation: {
    level1: '#ffffff',
    level2: '#f9f9f9',
    level3: '#f6f6f6',
    level4: '#f3f3f3',
    level5: '#f0f0f0',
  },
};

export type AppColors = typeof darkColors;
