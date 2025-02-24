import { Theme } from '@mui/material/styles';

export const responsiveDrawerWidth = (theme: Theme) => ({
  width: {
    xs: '100%',
    sm: '320px',
  }
});

export const responsiveDrawerPaper = (theme: Theme) => ({
  width: {
    xs: '100%',
    sm: '320px',
  },
  height: '100%',
  position: 'relative',
  overflowY: 'auto',
  padding: {
    xs: theme.spacing(1),
    sm: theme.spacing(2)
  }
});

export const responsiveDialogContent = (theme: Theme) => ({
  width: {
    xs: '95vw',
    sm: '600px',
    md: '800px'
  },
  maxWidth: '100%',
  maxHeight: {
    xs: '95vh',
    sm: '80vh'
  },
  margin: {
    xs: theme.spacing(1),
    sm: theme.spacing(4)
  }
});

export const responsiveText = (theme: Theme) => ({
  fontSize: {
    xs: '0.875rem',
    sm: '1rem'
  }
});

export const responsiveHeading = (theme: Theme) => ({
  fontSize: {
    xs: '1.25rem',
    sm: '1.5rem'
  }
});

export const responsivePadding = (theme: Theme) => ({
  padding: {
    xs: theme.spacing(1),
    sm: theme.spacing(2)
  }
});

export const responsiveMargin = (theme: Theme) => ({
  margin: {
    xs: theme.spacing(1),
    sm: theme.spacing(2)
  }
});
