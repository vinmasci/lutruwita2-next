import React, { useState } from 'react';
import { Typography, Button, Box } from '@mui/material';
import { POI_ICONS } from '../../constants/poi-icons';
import { POI_CATEGORIES, POICategory, POIIconName } from '../../types/poi.types';
import { ICON_PATHS } from '../../constants/icon-paths';
import { usePOIContext } from '../../context/POIContext';
import { PlaceLabel } from '../../utils/placeDetection';
import { IconGrid, IconGridItem, StyledTooltip } from '../POIDrawer/POIDrawer.styles';

interface PlacePOIIconSelectionProps {
  place: PlaceLabel;
  onBack: () => void;
}

const PlacePOIIconSelection: React.FC<PlacePOIIconSelectionProps> = ({ place, onBack }) => {
  const { addPOI, removePOI, pois } = usePOIContext();
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  
  // Initialize with existing POIs for this place
  const [selectedIcons, setSelectedIcons] = useState<Set<POIIconName>>(() => {
    const existingIcons = new Set<POIIconName>();
    pois.forEach(poi => {
      if (poi.type === 'place' && poi.placeId === place.id) {
        existingIcons.add(poi.icon);
      }
    });
    return existingIcons;
  });

  const handleIconClick = (iconName: POIIconName, category: POICategory) => {
    const newSelectedIcons = new Set(selectedIcons);
    if (selectedIcons.has(iconName)) {
      newSelectedIcons.delete(iconName);
    } else {
      newSelectedIcons.add(iconName);
    }
    setSelectedIcons(newSelectedIcons);

    if (newSelectedIcons.has(iconName)) {
      // Add POI
      addPOI({
        type: 'place',
        placeId: place.id,
        name: place.name,
        position: {
          lat: place.coordinates[1],
          lng: place.coordinates[0]
        },
        category,
        icon: iconName,
      });
    } else {
      // Remove POI
      const existingPOI = pois.find(
        poi => 
          poi.type === 'place' && 
          poi.placeId === place.id && 
          poi.icon === iconName
      );
      if (existingPOI) {
        removePOI(existingPOI.id);
      }
    }
  };

  return (
    <Box sx={{ 
      pt: 2,
      pb: 2,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <Box sx={{ px: 2 }}>
        <Typography variant="h6" gutterBottom>
          Choose POI Type
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Choose an icon for your point of interest.
        </Typography>
      </Box>

      <Box sx={{ mt: 3 }}>
        {[
          { category: 'Road Information', icons: ['Plane', 'TrainStation', 'Bus', 'Ship'] },
          { category: 'Accommodation', icons: ['Bell', 'BedDouble', 'Car', 'Tent'] },
          { category: 'Food & Drink', icons: ['ShoppingCart', 'Utensils', 'Pizza', 'Coffee', 'Beer', 'Wine'] },
          { category: 'Facilities', icons: ['Toilet', 'ShowerHead'] },
          { category: 'Town Services', icons: ['Bike', 'Hospital', 'Fuel', 'Store', 'Mail'] },
          { category: 'Event Information', icons: ['Stethoscope', 'BatteryCharging', 'X', 'CircleDot', 'Wrench'] },
          { category: 'Natural Features', icons: ['Swimming', 'Droplet'] }
        ].map(({ category, icons }, groupIndex) => (
          <Box key={groupIndex}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'white',
                pl: 2,
                pb: 0.25,
                display: 'block',
                fontSize: '0.7rem',
                opacity: 0.8
              }}
            >
              {category}
            </Typography>
            <IconGrid 
              sx={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${icons.length}, 20px)`,
                gap: '8px', 
                justifyContent: 'start',
                mb: 1,
                pl: 2
              }}
            >
              {icons.map((iconName) => {
              const icon = POI_ICONS.find(i => i.name === iconName);
              if (!icon) return null;
              const category = POI_CATEGORIES[icon.category];
              const iconColor = icon.style?.color || category.color;
              return (
                <IconGridItem
                  key={icon.name}
                  selected={selectedIcons.has(icon.name)}
                  onClick={() => handleIconClick(icon.name, icon.category as POICategory)}
                  onMouseEnter={() => setHoveredIcon(icon.name)}
                  onMouseLeave={() => setHoveredIcon(null)}
                  sx={{ 
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
                  }}
                >
                  <i 
                    className={ICON_PATHS[icon.name]} 
                    style={{ 
                      fontSize: '12px', 
                      color: '#fff',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }} 
                  />
                  {hoveredIcon === icon.name && (
                    <StyledTooltip>
                      {icon.label}
                    </StyledTooltip>
                  )}
                </IconGridItem>
              );
            })}
              </IconGrid>
            </Box>
          ))}
      </Box>

      <Box sx={{ px: 2 }}>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <Button 
            variant="text" 
            color="inherit" 
            onClick={onBack}
            sx={{ flex: 1 }}
          >
            Back
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={onBack}
            sx={{ flex: 2 }}
          >
            Done
          </Button>
        </div>
      </Box>
    </Box>
  );
};

export default PlacePOIIconSelection;
