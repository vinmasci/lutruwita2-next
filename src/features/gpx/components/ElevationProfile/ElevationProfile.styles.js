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
        transform: 'translateY(100%)'
    },
    '& > *': {
        flex: 1,
        minHeight: 0 // Important for proper scrolling
    }
}));
export const ElevationHeader = styled(Box)(({ theme }) => ({
    padding: theme.spacing(0.5),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    '& .MuiTypography-root': {
        fontSize: '0.875rem',
        fontWeight: 500
    },
    '& .MuiIconButton-root': {
        padding: theme.spacing(0.5)
    }
}));
export const ElevationContent = styled(Box)(({ theme }) => ({
    height: '100%',
    padding: 0,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
    '& .recharts-cartesian-grid-horizontal line, & .recharts-cartesian-grid-vertical line': {
        stroke: 'rgba(255, 255, 255, 0.05)'
    },
    '& .recharts-text': {
        fill: 'rgba(255, 255, 255, 0.7)'
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
                fontFamily: 'Futura, sans-serif',
                marginBottom: '2px'
            },
            '& .recharts-tooltip-item': {
                color: 'rgba(255, 255, 255, 0.95)',
                fontSize: '0.75rem',
                fontFamily: 'Futura, sans-serif',
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
}));
