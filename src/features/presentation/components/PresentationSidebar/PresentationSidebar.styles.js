import { styled } from '@mui/material/styles';
import { Drawer } from '@mui/material';
export const StyledDrawer = styled(Drawer)({
    width: '56px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    marginTop: '64px', // Add margin top to account for header
    '& .MuiDrawer-paper': {
        width: '56px',
        backgroundColor: '#1a1a1a',
        borderRight: '1px solid #333',
        color: '#ffffff',
        overflowX: 'hidden',
        zIndex: 91, // Higher than NestedDrawer (90) but lower than elevation profile (102)
        top: '64px', // Position below the header
        height: 'calc(100% - 64px)', // Adjust height to account for header
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
export const NestedDrawer = styled(Drawer, {
    shouldForwardProp: (prop) => prop !== 'customWidth'
})(({ theme, customWidth }) => {
    return {
        width: customWidth || (theme.breakpoints.values.sm ? '264px' : '100%'),
        flexShrink: 0,
        whiteSpace: 'nowrap',
        position: 'absolute',
        top: '64px', // Position below the header
        height: 'calc(100% - 64px)', // Adjust height to account for header
        '& .MuiDrawer-paper': {
            width: customWidth || (theme.breakpoints.values.sm ? '264px' : '100%'),
            backgroundColor: 'rgba(26, 26, 26, 0.9)', // Added transparency (0.9 alpha)
            backdropFilter: 'blur(5px)', // Optional: adds a slight blur effect behind
            borderRight: '1px solid #333',
            color: '#ffffff',
            overflowX: 'hidden',
            marginLeft: theme.breakpoints.values.sm ? '56px' : 0,
            transition: 'transform 0.3s ease-in-out',
            zIndex: 90, // Lower than elevation profile (102) and sidebar (101)
            transform: 'translateX(0)', // Visible when open
            height: '100%', // Full height of the adjusted container
            '&.MuiDrawer-paperAnchorLeft.MuiDrawer-paperHidden': {
                transform: 'translateX(-100%)', // Hidden when closed
                visibility: 'hidden'
            }
        }
    };
});
