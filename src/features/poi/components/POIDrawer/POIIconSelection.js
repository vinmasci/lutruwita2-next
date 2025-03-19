import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { Typography, Button, Box } from '@mui/material';
import { POI_CATEGORIES } from '../../types/poi.types';
import { POI_ICONS } from '../../constants/poi-icons';
import { ICON_PATHS } from '../../constants/icon-paths';
import { IconGrid, IconGridItem, StyledTooltip } from './POIDrawer.styles';

const POIIconSelection = ({ mode, selectedIcon, onIconSelect, onBack, startDrag }) => {
    const [hoveredIcon, setHoveredIcon] = React.useState(null);
    
    const renderIcon = (iconName, categoryKey) => {
        const icon = POI_ICONS.find(i => i.name === iconName);
        if (!icon) return null;
        
        const category = POI_CATEGORIES[categoryKey];
        const iconColor = icon.style?.color || category.color;
        
        return _jsxs(IconGridItem, { 
            selected: selectedIcon === icon.name, 
            onClick: () => {
                onIconSelect(icon.name);
                startDrag(icon.name, categoryKey);
            }, 
            onMouseEnter: () => setHoveredIcon(icon.name), 
            onMouseLeave: () => setHoveredIcon(null), 
            sx: {
                position: 'relative',
                width: '20px',
                height: '20px',
                backgroundColor: iconColor,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': {
                    transform: 'scale(1.1)'
                }
            }, 
            children: [
                icon.name === 'ClimbHC' 
                    ? _jsx("span", { style: { fontSize: '11px', color: 'white' }, children: "HC" })
                    : _jsx("i", { className: ICON_PATHS[icon.name], style: { fontSize: '12px', color: 'white' } }),
                hoveredIcon === icon.name && _jsx(StyledTooltip, { children: icon.label })
            ] 
        }, icon.name);
    };
    
    const renderIconGroup = (icons, groupIndex, categoryKey) => {
        return _jsx(IconGrid, { 
            sx: { mb: groupIndex < icons.length - 1 ? 1 : 0 }, 
            children: icons.map(iconName => renderIcon(iconName, categoryKey))
        }, groupIndex);
    };
    
    const renderCategory = ({ category: categoryKey, label, iconGroups }) => {
        return _jsxs(Box, { 
            sx: { mb: 2 }, 
            children: [
                _jsx(Typography, { 
                    variant: "caption", 
                    sx: {
                        color: 'white',
                        mb: 0.5,
                        display: 'block',
                        fontSize: '0.7rem',
                        opacity: 0.7,
                        letterSpacing: '0.5px',
                        width: '100%',
                        wordWrap: 'break-word'
                    }, 
                    children: label 
                }), 
                iconGroups.map((icons, groupIndex) => 
                    renderIconGroup(icons, groupIndex, categoryKey)
                )
            ] 
        }, `${categoryKey}-${iconGroups[0][0]}`);
    };
    
    const categories = [
        {
            category: 'road-information',
            label: 'Road Information',
            iconGroups: [
                ['TrafficCone', 'Octagon', 'AlertOctagon', 'Lock', 'Unlock', 'ArrowUpRight', 'Construction', 'HeavyTraffic'],
                ['AudioWaveform', 'Route', 'RailTrail', 'ChevronsRightLeft', 'HikeABike', 'WaterCrossing', 'RemoteArea']
            ]
        },
        { 
            category: 'accommodation', 
            label: 'Accommodation', 
            iconGroups: [['Tent', 'Huts', 'Car', 'BedDouble']] 
        },
        {
            category: 'food-drink',
            label: 'Food & Drink',
            iconGroups: [
                ['Utensils', 'Coffee', 'Pizza', 'ShoppingCart', 'Store', 'Beer', 'Wine'],
                ['Droplet']
            ]
        },
        { 
            category: 'natural-features', 
            label: 'Natural Features', 
            iconGroups: [['Mountain', 'TreePine', 'Binoculars', 'MountainBikePark', 'Swimming']] 
        },
        { 
            category: 'town-services', 
            label: 'Town Services', 
            iconGroups: [['Hospital', 'Toilet', 'ShowerHead', 'ParkingSquare', 'Fuel', 'Mail', 'Bike']] 
        },
        { 
            category: 'transportation', 
            label: 'Transportation', 
            iconGroups: [['Bus', 'TrainStation', 'Plane', 'Ship']] 
        },
        { 
            category: 'event-information', 
            label: 'Event Information', 
            iconGroups: [['PlayCircle', 'StopCircle', 'Stethoscope', 'BatteryCharging', 'X', 'Wrench', 'Flag']] 
        },
        { 
            category: 'climb-category', 
            label: 'Climb Categories', 
            iconGroups: [['ClimbHC', 'ClimbCat1', 'ClimbCat2', 'ClimbCat3', 'ClimbCat4']] 
        }
    ];
    
    return _jsx(Box, { 
        sx: { 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            paddingBottom: '320px', // Add extra padding at the bottom to ensure content is visible
            overflowY: 'auto'
        },
        children: _jsxs(_Fragment, { 
            children: [
                _jsx(Typography, { 
                    variant: "h6", 
                    gutterBottom: true, 
                    sx: { width: '100%', wordWrap: 'break-word' }, 
                    children: mode === 'regular' ? 'Choose POI Type' : 'Select POI Types' 
                }), 
                _jsx(Typography, { 
                    variant: "body2", 
                    color: "text.secondary", 
                    gutterBottom: true, 
                    sx: { width: '100%', wordWrap: 'break-word' }, 
                    children: mode === 'regular'
                        ? 'Choose an icon for your point of interest.'
                        : 'Select one or more icons to attach to the selected place.' 
                }), 
                categories.map(renderCategory), 
                _jsx("div", { 
                    style: { marginTop: 'auto', display: 'flex', gap: '8px' }, 
                    children: _jsx(Button, { 
                        variant: "text", 
                        color: "inherit", 
                        onClick: onBack, 
                        fullWidth: true, 
                        children: "Back" 
                    }) 
                })
            ] 
        }) 
    });
};

export default POIIconSelection;
