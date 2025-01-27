import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

export const ElevationPanel = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(26, 26, 26, 0.9)',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.standard,
    easing: theme.transitions.easing.easeInOut,
  }),
  zIndex: 90,
  '&.collapsed': {
    transform: 'translateY(100%)'
  }
}));

export const ElevationHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
}));

export const ElevationContent = styled(Box)(({ theme }) => ({
  height: 200,
  padding: theme.spacing(2)
}));
