import { styled } from '@mui/material/styles';
import MuiDrawer from '@mui/material/Drawer';
import { Theme } from '@mui/material/styles';

export const NestedDrawer = styled(MuiDrawer)((props: { theme: Theme }) => {
  const { theme } = props;
  return {
    position: 'absolute',
    left: 0,
    [theme.breakpoints.up('xs')]: {
      width: '100%'
    },
    [theme.breakpoints.up('sm')]: {
      width: '320px'
    },
    flexShrink: 0,
    zIndex: 100,
    '& .MuiDrawer-paper': {
      [theme.breakpoints.up('xs')]: {
        width: '100%',
        marginLeft: 0,
        padding: theme.spacing(1)
      },
      [theme.breakpoints.up('sm')]: {
        width: '320px',
        marginLeft: 48,
        padding: theme.spacing(2)
      },
      [theme.breakpoints.up('md')]: {
        marginLeft: 56
      },
      backgroundColor: 'rgb(35, 35, 35)',
      borderLeft: '1px solid #333',
      color: '#ffffff',
      boxSizing: 'border-box',
      height: '100%'
    }
  };
});

export const StyledDrawer = styled(MuiDrawer)((props: { theme: Theme }) => {
  const { theme } = props;
  return {
    [theme.breakpoints.up('xs')]: {
      width: 48
    },
    [theme.breakpoints.up('md')]: {
      width: 56
    },
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    zIndex: 101,
    '& .MuiDrawer-paper': {
      [theme.breakpoints.up('xs')]: {
        width: 48
      },
      [theme.breakpoints.up('md')]: {
        width: 56
      },
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
        backgroundColor: 'rgb(255, 255, 255)',
        '&:hover': {
          backgroundColor: 'rgb(255, 255, 255)',
        }
      }
    },
    '& .MuiListItemButton-root': {
      minHeight: 48,
      justifyContent: 'center',
      px: 2.5,
      '&:hover': {
        backgroundColor: '#2a2a2a',
      }
    },
    '& .MuiListItemIcon-root': {
      minWidth: 0,
      color: '#ffffff',
      justifyContent: 'center',
      '& svg': {
        transition: 'color 0.2s ease',
      },
      '.MuiListItemButton-root:hover &, .MuiListItemButton-root.Mui-selected &, .MuiListItemButton-root[data-active="true"] &': {
        '& svg': {
          color: '#ff4d4f',
        }
      }
    }
  };
});
