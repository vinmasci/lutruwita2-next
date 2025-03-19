// This file is commented out to disable Place POIs functionality while keeping draggable POIs
/*
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Typography, Button, Box } from '@mui/material';
import { POI_ICONS } from '../../constants/poi-icons';
import { POI_CATEGORIES } from '../../types/poi.types';
import { ICON_PATHS } from '../../constants/icon-paths';
import { usePOIContext } from '../../context/POIContext';
import { IconGrid, IconGridItem, StyledTooltip } from '../POIDrawer/POIDrawer.styles';
const PlacePOIIconSelection = ({ place, onBack }) => {
    const { addPOI, removePOI, pois } = usePOIContext();
    const [hoveredIcon, setHoveredIcon] = useState(null);
    // Initialize selectedIcons with existing icons for this place
    const [selectedIcons, setSelectedIcons] = useState(() => {
        // Find POIs by placeId or by coordinates
        const existingIcons = pois
            .filter(poi => 
                (poi.type === 'place' && poi.placeId === place.id) || // Match by placeId
                (poi.type === 'place' && 
                 poi.coordinates[0] === place.coordinates[0] && 
                 poi.coordinates[1] === place.coordinates[1]) // Match by coordinates as fallback
            )
            .map(poi => poi.icon);
        return new Set(existingIcons);
    });
    
    // Update selectedIcons when place or pois change
    useEffect(() => {
        // Find POIs by placeId or by coordinates
        const existingIcons = pois
            .filter(poi => 
                (poi.type === 'place' && poi.placeId === place.id) || // Match by placeId
                (poi.type === 'place' && 
                 poi.coordinates[0] === place.coordinates[0] && 
                 poi.coordinates[1] === place.coordinates[1]) // Match by coordinates as fallback
            )
            .map(poi => poi.icon);
        setSelectedIcons(new Set(existingIcons));
    }, [place.id, place.coordinates, pois]);
    const handleIconClick = (iconName, category) => {
        // Find existing POI with this icon by placeId or coordinates
        const existingPOI = pois.find(poi => 
            poi.type === 'place' && 
            poi.icon === iconName && 
            (
                poi.placeId === place.id || // Match by placeId
                (poi.coordinates[0] === place.coordinates[0] && 
                 poi.coordinates[1] === place.coordinates[1]) // Match by coordinates
            )
        );
        
        const newSelectedIcons = new Set(selectedIcons);
        
        if (existingPOI) {
            // If POI exists, remove it
            removePOI(existingPOI.id);
            newSelectedIcons.delete(iconName);
        }
        else {
            // If POI doesn't exist, add it
            addPOI({
                type: 'place',
                placeId: place.id,
                name: place.name,
                coordinates: place.coordinates,
                category,
                icon: iconName,
            });
            newSelectedIcons.add(iconName);
        }
        setSelectedIcons(newSelectedIcons);
    };
    return (_jsxs(Box, { sx: {
            pt: 2,
            pb: 2,
            width: '100%',
            boxSizing: 'border-box'
        }, children: [_jsxs(Box, { sx: { px: 2 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Choose POI Type" }), _jsx(Typography, { variant: "body2", color: "text.secondary", gutterBottom: true, children: "Choose an icon for your point of interest." })] }), _jsx(Box, { sx: { mt: 3 }, children: [
                    { category: 'Road Information', icons: ['Plane', 'TrainStation', 'Bus', 'Ship'] },
                    { category: 'Accommodation', icons: ['Bell', 'BedDouble', 'Car', 'Tent'] },
                    { category: 'Food & Drink', icons: ['ShoppingCart', 'Utensils', 'Pizza', 'Coffee', 'Beer', 'Wine'] },
                    { category: 'Facilities', icons: ['Toilet', 'ShowerHead'] },
                    { category: 'Town Services', icons: ['Bike', 'Hospital', 'Fuel', 'Store', 'Mail'] },
                    { category: 'Event Information', icons: ['Stethoscope', 'BatteryCharging', 'X', 'CircleDot', 'Wrench'] },
                    { category: 'Natural Features', icons: ['Swimming', 'Droplet'] }
                ].map(({ category, icons }, groupIndex) => (_jsxs(Box, { children: [_jsx(Typography, { variant: "caption", sx: {
                                color: 'white',
                                pl: 2,
                                pb: 0.25,
                                display: 'block',
                                fontSize: '0.7rem',
                                opacity: 0.8
                            }, children: category }), _jsx(IconGrid, { sx: {
                                display: 'grid',
                                gridTemplateColumns: `repeat(${icons.length}, 20px)`,
                                gap: '8px',
                                justifyContent: 'start',
                                mb: 1,
                                pl: 2
                            }, children: icons.map((iconName) => {
                                const icon = POI_ICONS.find(i => i.name === iconName);
                                if (!icon)
                                    return null;
                                const category = POI_CATEGORIES[icon.category];
                                const iconColor = icon.style?.color || category.color;
                                return (_jsxs(IconGridItem, { selected: selectedIcons.has(icon.name), onClick: () => handleIconClick(icon.name, icon.category), onMouseEnter: () => setHoveredIcon(icon.name), onMouseLeave: () => setHoveredIcon(null), sx: {
                                        position: 'relative',
                                        width: '20px !important',
                                        height: '20px !important',
                                        backgroundColor: '#1e1e1e',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                                        '&:hover': {
                                            transform: 'scale(1.1)',
                                            boxShadow: '0 3px 6px rgba(0, 0, 0, 0.3)'
                                        },
                                        ...(selectedIcons.has(icon.name) && {
                                            boxShadow: '0 0 0 1px white, 0 3px 6px rgba(0, 0, 0, 0.3)',
                                            transform: 'scale(1.1)'
                                        })
                                    }, children: [_jsx("i", { className: ICON_PATHS[icon.name], style: {
                                                fontSize: '12px',
                                                color: '#fff',
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)'
                                            } }), hoveredIcon === icon.name && (_jsx(StyledTooltip, { children: icon.label }))] }, icon.name));
                            }) })] }, groupIndex))) }), _jsx(Box, { sx: { px: 2 }, children: _jsxs("div", { style: { display: 'flex', gap: '8px', marginTop: '16px' }, children: [_jsx(Button, { variant: "text", color: "inherit", onClick: onBack, sx: { flex: 1 }, children: "Back" }), _jsx(Button, { variant: "contained", color: "primary", onClick: () => {
                                setSelectedIcons(new Set());
                                onBack();
                            }, sx: { flex: 2 }, children: "Done" })] }) })] }));
};
export default PlacePOIIconSelection;
*/
