import { Theme } from '@mui/material/styles';

// Device detection utility
export const isSmallMobile = (): boolean => {
  return window.innerWidth < 375;
};

export const isMobile = (): boolean => {
  return window.innerWidth < 600;
};

export const isTablet = (): boolean => {
  return window.innerWidth >= 600 && window.innerWidth < 900;
};

// Responsive drawer width using viewport-relative units
export const responsiveDrawerWidth = (theme: Theme) => ({
  width: {
    xs: '100%',
    sm: '7vw', // ~7% of viewport width on tablet and up
  },
  minWidth: {
    xs: 'auto',
    sm: '28px', // Minimum width to ensure usability
  },
  maxWidth: {
    xs: 'none',
    sm: '56px', // Maximum width to prevent excessive growth
  }
});

export const responsiveDrawerPaper = (theme: Theme) => ({
  width: {
    xs: '100%',
    sm: '7vw', // ~7% of viewport width on tablet and up
  },
  minWidth: {
    xs: 'auto',
    sm: '28px', // Minimum width to ensure usability
  },
  maxWidth: {
    xs: 'none',
    sm: '56px', // Maximum width to prevent excessive growth
  },
  height: '100%',
  position: 'relative',
  overflowY: 'auto',
  padding: {
    xs: theme.spacing(0.5),
    sm: theme.spacing(1),
    md: theme.spacing(2)
  }
});

export const responsiveNestedDrawerWidth = (theme: Theme) => ({
  width: {
    xs: '100%',
    sm: '30vw', // ~30% of viewport width on tablet
    md: '264px', // Fixed width on desktop
  },
  minWidth: {
    xs: 'auto',
    sm: '200px', // Minimum width to ensure content is readable
  },
  maxWidth: {
    xs: 'none',
    sm: '300px', // Maximum width to prevent excessive growth
  }
});

export const responsiveDialogContent = (theme: Theme) => ({
  width: {
    xs: '95vw',
    sm: '80vw',
    md: '70vw'
  },
  maxWidth: '100%',
  maxHeight: {
    xs: '95vh',
    sm: '80vh'
  },
  margin: {
    xs: theme.spacing(0.5),
    sm: theme.spacing(1),
    md: theme.spacing(4)
  }
});

export const responsiveText = (theme: Theme) => ({
  fontSize: {
    xs: '0.75rem', // Smaller on mobile
    sm: '0.875rem', // Medium on tablet
    md: '1rem' // Normal on desktop
  }
});

export const responsiveHeading = (theme: Theme) => ({
  fontSize: {
    xs: '1rem', // Smaller on mobile
    sm: '1.25rem', // Medium on tablet
    md: '1.5rem' // Normal on desktop
  }
});

export const responsivePadding = (theme: Theme) => ({
  padding: {
    xs: theme.spacing(0.5),
    sm: theme.spacing(1),
    md: theme.spacing(2)
  }
});

export const responsiveMargin = (theme: Theme) => ({
  margin: {
    xs: theme.spacing(0.5),
    sm: theme.spacing(1),
    md: theme.spacing(2)
  }
});

// New utility for bottom panel height
export const responsivePanelHeight = (theme: Theme) => ({
  height: {
    xs: '25vh', // 25% of viewport height on mobile
    sm: '30vh', // 30% of viewport height on tablet
    md: '300px' // Fixed height on desktop
  },
  minHeight: {
    xs: '150px', // Minimum height to ensure usability
    sm: '200px',
    md: '250px'
  },
  maxHeight: {
    xs: '250px', // Maximum height on mobile
    sm: '300px', // Maximum height on tablet
    md: '350px' // Maximum height on desktop
  }
});

// Utility for control sizing
export const responsiveControlSize = (theme: Theme) => ({
  width: {
    xs: '2rem', // Smaller on mobile
    sm: '2.5rem', // Medium on tablet
    md: '3rem' // Normal on desktop
  },
  height: {
    xs: '2rem',
    sm: '2.5rem',
    md: '3rem'
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem'
  },
  padding: {
    xs: theme.spacing(0.25),
    sm: theme.spacing(0.5),
    md: theme.spacing(0.75)
  }
});

// Utility for icon sizing
export const responsiveIconSize = (theme: Theme) => ({
  fontSize: {
    xs: '1rem', // Smaller on mobile
    sm: '1.25rem', // Medium on tablet
    md: '1.5rem' // Normal on desktop
  }
});
