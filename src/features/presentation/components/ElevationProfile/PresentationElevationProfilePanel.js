import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { PresentationElevationProfile } from './PresentationElevationProfile';
import { styled } from '@mui/material/styles';
import { Box, ButtonBase } from '@mui/material';
import { IconButton } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { PresentationRouteDescriptionPanel } from '../RouteDescription';
import { PresentationWeatherProfilePanel } from '../WeatherProfile';
import { responsivePanelHeight } from '../../../../utils/responsive';

const ElevationPanel = styled(Box)(({ theme }) => {
    const panelHeight = responsivePanelHeight(theme);
    
    return {
        position: 'fixed',
        bottom: 0,
        left: {
            xs: 0,
            sm: '7vw', // Match sidebar width
        },
        minLeft: {
            xs: 0,
            sm: '28px', // Match sidebar min-width
        },
        maxLeft: {
            xs: 0,
            sm: '56px', // Match sidebar max-width
        },
        right: 0,
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        transition: theme.transitions.create('transform', {
            duration: theme.transitions.duration.standard,
            easing: theme.transitions.easing.easeInOut,
        }),
        zIndex: 102,
        height: panelHeight.height,
        minHeight: panelHeight.minHeight,
        maxHeight: panelHeight.maxHeight,
        '&.collapsed': {
            transform: `translateY(${typeof panelHeight.height === 'object' 
                ? '30vh' // Default for responsive height
                : panelHeight.height})`
        },
        [theme.breakpoints.down('sm')]: {
            left: '10vw', // Match sidebar width on mobile
        },
        [theme.breakpoints.down(375)]: {
            left: '12vw', // Match sidebar width on small mobile
        },
        [theme.breakpoints.down('xs')]: {
            left: 0, // Full width on extra small devices
        }
    };
});

const TabButton = ({ tab, label, activeTab, onClick, isCollapsed, setIsCollapsed }) => _jsx(ButtonBase, {
    onClick: () => {
        if (isCollapsed) {
            setIsCollapsed(false);
        }
        onClick();
    },
    sx: {
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '4px 4px 0 0',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: activeTab === tab ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        marginRight: '4px',
        '&:hover': {
            backgroundColor: 'rgba(45, 45, 45, 0.9)'
        }
    },
    children: label
});

export const PresentationElevationProfilePanel = ({ route, header }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('elevation'); // 'elevation' | 'description' | 'weather'

    return _jsxs(ElevationPanel, { 
        className: isCollapsed ? 'collapsed' : '', 
        children: [
            _jsxs("div", { 
                style: {
                    position: 'absolute',
                    top: '-24px',
                    left: '16px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    zIndex: 103
                }, 
                children: [
                    _jsx(TabButton, {
                        tab: 'elevation',
                        label: 'Elevation',
                        activeTab: activeTab,
                        onClick: () => setActiveTab('elevation'),
                        isCollapsed: isCollapsed,
                        setIsCollapsed: setIsCollapsed
                    }),
                    _jsx(TabButton, {
                        tab: 'description',
                        label: 'Description',
                        activeTab: activeTab,
                        onClick: () => setActiveTab('description'),
                        isCollapsed: isCollapsed,
                        setIsCollapsed: setIsCollapsed
                    }),
                    _jsx(TabButton, {
                        tab: 'weather',
                        label: 'Weather',
                        activeTab: activeTab,
                        onClick: () => setActiveTab('weather'),
                        isCollapsed: isCollapsed,
                        setIsCollapsed: setIsCollapsed
                    })
                ]
            }),
            _jsx("div", { 
                style: {
                    position: 'absolute',
                    top: '-24px',
                    right: '16px',
                    backgroundColor: 'rgba(26, 26, 26, 0.9)',
                    borderRadius: '4px 4px 0 0',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderBottom: 'none',
                    zIndex: 103
                }, 
                children: _jsx(IconButton, { 
                    onClick: () => setIsCollapsed(!isCollapsed), 
                    size: "small", 
                    sx: {
                        color: 'white',
                        padding: '2px',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                    }, 
                    children: isCollapsed ? _jsx(KeyboardArrowUpIcon, {}) : _jsx(KeyboardArrowDownIcon, {}) 
                }) 
            }),
            header,
            _jsx(Box, {
                sx: {
                    height: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    '& > *': {
                        flex: 1,
                        minHeight: 0
                    }
                },
                children: activeTab === 'elevation' 
                    ? route && _jsx(PresentationElevationProfile, { route: route })
                    : activeTab === 'description'
                    ? route && _jsx(PresentationRouteDescriptionPanel, { route: route })
                    : route && _jsx(PresentationWeatherProfilePanel, { route: route })
            })
        ] 
    });
};
