import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

export const ElevationPanel = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: '56px', // Width of the sidebar
  right: 0,
  height: '300px',
  backgroundColor: 'rgba(26, 26, 26, 0.9)',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.standard,
    easing: theme.transitions.easing.easeInOut,
  }),
  zIndex: 102,
  display: 'flex',
  flexDirection: 'column',
  '&.collapsed': {
    transform: 'translateY(300px)',
    visibility: 'hidden' // Hide completely when collapsed
  },
  '& > *': {
    flex: 1,
    minHeight: 0 // Important for proper scrolling
  }
}));

export const TabContainer = styled(Box)({
  position: 'absolute',
  top: '-24px',
  left: '16px',
  display: 'flex',
  alignItems: 'flex-end',
  gap: '4px',
  zIndex: 103
});

export const CollapseButton = styled(Box)({
  backgroundColor: 'rgba(26, 26, 26, 0.9)',
  borderRadius: '4px 4px 0 0',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderBottom: 'none',
  height: '24px',
  display: 'flex',
  alignItems: 'center'
});

export const ElevationContent = styled('div')({
  width: '100%',
  height: '100%',
  padding: 0,
  backgroundColor: '#1a1a1a',
  '& .recharts-cartesian-grid-horizontal line, & .recharts-cartesian-grid-vertical line': {
    stroke: 'rgba(255, 255, 255, 0.05)'
  },
  '& .recharts-text': {
    fill: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Futura'
  },
  '& .recharts-tooltip-wrapper': {
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    '& .recharts-default-tooltip': {
      background: 'linear-gradient(135deg, rgba(238, 82, 83, 0.15) 0%, rgba(30, 30, 30, 0.95) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '4px',
      padding: '6px 8px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      '& .recharts-tooltip-label': {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: '0.75rem',
        fontFamily: 'Futura',
        marginBottom: '2px'
      },
      '& .recharts-tooltip-item': {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: '0.75rem',
        fontFamily: 'Futura',
        padding: '1px 0'
      },
      '& .recharts-tooltip-item-name': {
        color: 'rgba(255, 255, 255, 0.7)'
      }
    }
  },
  '& .recharts-area-area': {
    fill: '#4b6584'
  },
  '& .recharts-area-curve': {
    stroke: '#4b6584',
    strokeWidth: 2
  }
});
