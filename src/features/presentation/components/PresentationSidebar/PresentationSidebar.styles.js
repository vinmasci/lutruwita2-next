import { styled } from '@mui/material/styles';
import { Drawer } from '@mui/material';
import { responsiveDrawerWidth, responsiveNestedDrawerWidth } from '../../../../utils/responsive';

export const StyledDrawer = styled(Drawer)(({ theme }) => ({
    width: '7vw',
    minWidth: '28px',
    maxWidth: '56px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    '& .MuiDrawer-paper': {
        width: '7vw',
        minWidth: '28px',
        maxWidth: '56px',
        backgroundColor: '#1a1a1a',
        borderRight: '1px solid #333',
        color: '#ffffff',
        overflowX: 'hidden',
        '& .MuiListItemIcon-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            minWidth: {
                xs: '24px',
                sm: '32px',
                md: '40px'
            },
            transition: 'color 0.2s ease-in-out',
            '& svg': {
                fontSize: {
                    xs: '1rem',
                    sm: '1.25rem',
                    md: '1.5rem'
                }
            },
            '&:hover': {
                color: '#ffffff'
            }
        }
    },
    [theme.breakpoints.down('sm')]: {
        width: '10vw',
        '& .MuiDrawer-paper': {
            width: '10vw',
        }
    },
    [theme.breakpoints.down(375)]: {
        width: '12vw',
        '& .MuiDrawer-paper': {
            width: '12vw',
        }
    }
}));

export const NestedDrawer = styled(Drawer)(({ theme }) => {
    return {
        width: '30vw',
        minWidth: '200px',
        maxWidth: '264px',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        '& .MuiDrawer-paper': {
            width: '30vw',
            minWidth: '200px',
            maxWidth: '264px',
            backgroundColor: '#1a1a1a',
            borderRight: '1px solid #333',
            color: '#ffffff',
            overflowX: 'hidden',
            marginLeft: '7vw',
            minMarginLeft: '28px',
            maxMarginLeft: '56px',
            transition: 'margin-left 0.2s ease-in-out',
            zIndex: 99 // Lower than default Drawer z-index of 1200
        },
        [theme.breakpoints.down('sm')]: {
            width: '70vw',
            '& .MuiDrawer-paper': {
                width: '70vw',
                marginLeft: '10vw',
            }
        },
        [theme.breakpoints.down(375)]: {
            width: '80vw',
            '& .MuiDrawer-paper': {
                width: '80vw',
                marginLeft: '12vw',
            }
        },
        [theme.breakpoints.down('xs')]: {
            width: '100%',
            '& .MuiDrawer-paper': {
                width: '100%',
                marginLeft: 0,
            }
        }
    };
});
