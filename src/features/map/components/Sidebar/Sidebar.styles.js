import { styled } from '@mui/material/styles';
import MuiDrawer from '@mui/material/Drawer';
export const NestedDrawer = styled(MuiDrawer)(({ theme, customWidth }) => ({
    position: 'absolute',
    left: 0,
    top: 64, // Add top position to account for header height
    width: customWidth || 264,
    flexShrink: 0,
    zIndex: 100,
    height: 'calc(100% - 64px)', // Adjust height to account for header
    '& .MuiDrawer-paper': {
        width: customWidth || 264,
        backgroundColor: 'rgb(35, 35, 35)',
        borderLeft: '1px solid #333',
        color: '#ffffff',
        marginLeft: 56,
        boxSizing: 'border-box',
        height: '100%', // Full height of the adjusted container
        overflowY: 'auto', // Ensure content is scrollable
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%'
    },
}));
export const StyledDrawer = styled(MuiDrawer)(({ theme }) => ({
    width: 56,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    zIndex: 101,
    marginTop: 64, // Add margin top to account for header height
    '& .MuiDrawer-paper': {
        width: 56,
        backgroundColor: '#1a1a1a',
        borderRight: '1px solid #333',
        color: '#ffffff',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100% - 64px)', // Adjust height to account for header
        top: 64, // Position below the header
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
        },
    },
    '& .MuiListItemIcon-root': {
        minWidth: 0,
        color: '#ffffff',
        justifyContent: 'center',
    },
}));
