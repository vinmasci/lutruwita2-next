import { createTheme } from '@mui/material/styles';

// Create a theme instance with responsive sizing
const theme = createTheme({
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          '@media (max-width:600px)': {
            width: '100%',  // Full width on mobile
          },
          '@media (min-width:600px)': {
            width: '320px', // Fixed width on tablet and up
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          '@media (max-width:600px)': {
            width: '95%',    // Almost full width on mobile
            margin: '8px',   // Small margin on mobile
          },
          '@media (min-width:600px) and (max-width:900px)': {
            width: '600px',  // Fixed width on tablet
            margin: '32px',  // Larger margin on bigger screens
          },
          '@media (min-width:900px)': {
            width: '800px',  // Larger on desktop
            margin: '32px',  // Larger margin on bigger screens
          },
          maxWidth: '100%',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            fontSize: '0.875rem',  // Smaller text on mobile
          },
          '@media (min-width:600px)': {
            fontSize: '1rem',      // Normal size on tablet and up
          },
        },
        h6: {
          '@media (max-width:600px)': {
            fontSize: '1.1rem',    // Smaller headings on mobile
          },
          '@media (min-width:600px)': {
            fontSize: '1.25rem',   // Normal size on tablet and up
          },
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

// Add responsive padding/margin utilities
const createSpacing = (...args: Array<number | string>) => {
  const baseSpacing = 8;
  const factor = typeof args[0] === 'number' ? args[0] : 1;
  return `${baseSpacing * factor}px`;
};

theme.spacing = createSpacing;

export default theme;
