import { styled } from '@mui/material/styles';
import { Drawer } from '@mui/material';

export const StyledDrawer = styled(Drawer)({
  width: '56px',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '& .MuiDrawer-paper': {
    width: '56px',
    backgroundColor: '#1a1a1a',
    borderRight: '1px solid #333',
    color: '#ffffff',
    overflowX: 'hidden',
    '& .MuiListItemIcon-root': {
      color: 'rgba(255, 255, 255, 0.7)',
      minWidth: '40px',
      transition: 'color 0.2s ease-in-out',
      '&:hover': {
        color: '#ffffff'
      }
    }
  }
});

export const NestedDrawer = styled(Drawer)({
  width: '296px',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '& .MuiDrawer-paper': {
    width: '296px',
    backgroundColor: '#1a1a1a',
    borderRight: '1px solid #333',
    color: '#ffffff',
    overflowX: 'hidden',
    marginLeft: '56px',
    transition: 'margin-left 0.2s ease-in-out',
    zIndex: 99  // Lower than default Drawer z-index of 1200
  }
});
