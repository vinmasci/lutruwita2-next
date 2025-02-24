import { styled, Theme } from '@mui/material/styles';
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
        color: '#ee5253'
      },
      '&.Mui-selected': {
        color: '#ee5253'
      }
    }
  }
});

export const NestedDrawer = styled(Drawer)((props: { theme: Theme }) => {
  const { theme } = props;
  return {
    [theme.breakpoints.up('xs')]: {
      width: '100%'
    },
    [theme.breakpoints.up('sm')]: {
      width: '264px'
    },
    flexShrink: 0,
    whiteSpace: 'nowrap',
    '& .MuiDrawer-paper': {
      [theme.breakpoints.up('xs')]: {
        width: '100%',
        marginLeft: 0
      },
      [theme.breakpoints.up('sm')]: {
        width: '264px',
        marginLeft: '56px'
      },
      backgroundColor: '#1a1a1a',
      borderRight: '1px solid #333',
      color: '#ffffff',
      overflowX: 'hidden',
      transition: 'margin-left 0.2s ease-in-out',
      zIndex: 99  // Lower than default Drawer z-index of 1200
    }
  };
});
