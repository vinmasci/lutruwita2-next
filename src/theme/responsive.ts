import { createTheme } from '@mui/material/styles';

// Create a theme instance with responsive sizing
const theme = createTheme({
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          width: {
            xs: '100%',  // Full width on mobile
            sm: '320px', // Fixed width on tablet and up
          },
          '& .MuiDrawer-paper': {
            width: {
              xs: '100%',
              sm: '320px',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          width: {
            xs: '95%',    // Almost full width on mobile
            sm: '600px',  // Fixed width on tablet
            md: '800px',  // Larger on desktop
          },
          maxWidth: '100%',
          margin: {
            xs: '8px',    // Small margin on mobile
            sm: '32px',   // Larger margin on bigger screens
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontSize: {
            xs: '0.875rem',  // Smaller text on mobile
            sm: '1rem',      // Normal size on tablet
            md: '1rem',      // Normal size on desktop
          },
        },
        h6: {
          fontSize: {
            xs: '1.1rem',    // Smaller headings on mobile
            sm: '1.25rem',   // Normal size on tablet and up
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
theme.spacing = (factor: number) => {
  const baseSpacing = {
    xs: 4,    // 4px base on mobile
    sm: 8,    // 8px base on tablet
    md: 8,    // 8px base on desktop
  };

  return {
    xs: `${baseSpacing.xs * factor}px`,
    sm: `${baseSpacing.sm * factor}px`,
    md: `${baseSpacing.md * factor}px`,
  };
};

export default theme;
