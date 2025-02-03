import { styled } from '@mui/material/styles';
import MuiDrawer from '@mui/material/Drawer';

export const NestedDrawer = styled(MuiDrawer)(({ theme }) => ({
  position: 'absolute',
  left: 0,
  width: 264,
  flexShrink: 0,
  zIndex: 100,
  '& .MuiDrawer-paper': {
    width: 264,
    backgroundColor: 'rgba(35, 35, 35, 0.9)',
    borderLeft: '1px solid #333',
    color: '#ffffff',
    marginLeft: 56,
    padding: '16px',
  },
}));

export const StyledDrawer = styled(MuiDrawer)(({ theme }) => ({
  width: 56,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  zIndex: 101,
  '& .MuiDrawer-paper': {
    width: 56,
    backgroundColor: '#1a1a1a',
    borderRight: '1px solid #333',
    color: '#ffffff',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    '& .MuiDrawer-dragHandle': {
      position: 'absolute',
      right: -4,
      top: 0,
      bottom: 0,
      width: 8,
      cursor: 'ew-resize',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
      }
    }
  },
  '& .MuiListItemButton-root': {
    minHeight: 48,
    justifyContent: 'center',
    px: 2.5,
    '&:hover': {
      backgroundColor: '#2a2a2a',
    },
  },
  '& .MuiListItemIcon-root': {
    minWidth: 0,
    color: '#ffffff',
    justifyContent: 'center',
  },
}));
