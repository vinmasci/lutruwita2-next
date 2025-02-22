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
    transform: 'translateY(300px)'
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
