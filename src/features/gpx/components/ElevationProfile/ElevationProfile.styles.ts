import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

export const ElevationPanel = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: '56px', // Width of the sidebar
  right: 0,
  backgroundColor: 'rgba(26, 26, 26, 0.9)',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.standard,
    easing: theme.transitions.easing.easeInOut,
  }),
  zIndex: 102,
  '&.collapsed': {
    transform: 'translateY(100%)'
  }
}));

export const ElevationHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0.5),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  '& .MuiTypography-root': {
    fontSize: '0.875rem',
    fontWeight: 500
  },
  '& .MuiIconButton-root': {
    padding: theme.spacing(0.5)
  }
}));

export const ElevationContent = styled(Box)(({ theme }) => ({
  height: 220,
  padding: 0,
  '& .recharts-cartesian-grid-horizontal line, & .recharts-cartesian-grid-vertical line': {
    stroke: 'rgba(255, 255, 255, 0.1)'
  },
  '& .recharts-text': {
    fill: 'rgba(255, 255, 255, 0.7)'
  },
  '& .recharts-tooltip-wrapper': {
    backgroundColor: '#1e1e1e',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '4px'
  },
  '& .recharts-area-area': {
    fill: 'rgba(238, 82, 83, 0.2)'
  },
  '& .recharts-area-curve': {
    stroke: '#ee5253',
    strokeWidth: 2
  }
}));
