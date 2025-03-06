import React from 'react';
import { Typography, Button, Box } from '@mui/material';
import { POIIconSelectionProps } from './types';
import { POI_CATEGORIES, POICategory } from '../../types/poi.types';
import { POI_ICONS } from '../../constants/poi-icons';
import { ICON_PATHS } from '../../constants/icon-paths';
import { 
  IconGrid, 
  IconGridItem,
  StyledTooltip 
} from './POIDrawer.styles';

const POIIconSelection: React.FC<POIIconSelectionProps> = ({
  mode,
  selectedIcon,
  onIconSelect,
  onBack,
  startDrag
}) => {
  const [hoveredIcon, setHoveredIcon] = React.useState<string | null>(null);

  return (
    <>
      <Typography variant="h6" gutterBottom sx={{ width: '100%', wordWrap: 'break-word' }}>
        {mode === 'regular' ? 'Choose POI Type' : 'Select POI Types'}
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ width: '100%', wordWrap: 'break-word' }}>
        {mode === 'regular'
          ? 'Choose an icon for your point of interest.'
          : 'Select one or more icons to attach to the selected place.'}
      </Typography>

      {[
        { 
          category: 'road-information', 
          label: 'Road Information', 
          iconGroups: [
            ['TrafficCone', 'Octagon', 'AlertOctagon', 'Lock', 'Unlock', 'ArrowUpRight', 'Construction', 'HeavyTraffic'],
            ['AudioWaveform', 'Route', 'RailTrail', 'ChevronsRightLeft', 'HikeABike', 'WaterCrossing', 'RemoteArea']
          ]
        },
        { category: 'accommodation', label: 'Accommodation', iconGroups: [['Tent', 'Huts', 'Car', 'BedDouble']] },
        { 
          category: 'food-drink', 
          label: 'Food & Drink', 
          iconGroups: [
            ['Utensils', 'Coffee', 'Pizza', 'ShoppingCart', 'Store', 'Beer', 'Wine'],
            ['Droplet']
          ]
        },
        { category: 'natural-features', label: 'Natural Features', iconGroups: [['Mountain', 'TreePine', 'Binoculars', 'MountainBikePark', 'Swimming']] },
        { category: 'town-services', label: 'Town Services', iconGroups: [['Hospital', 'Toilet', 'ShowerHead', 'ParkingSquare', 'Fuel', 'Mail', 'Bike']] },
        { category: 'transportation', label: 'Transportation', iconGroups: [['Bus', 'TrainStation', 'Plane', 'Ship']] },
        { category: 'event-information', label: 'Event Information', iconGroups: [['PlayCircle', 'StopCircle', 'Stethoscope', 'BatteryCharging', 'X', 'Wrench', 'Flag']] }
      ].map(({ category: categoryKey, label, iconGroups }) => {
        return (
          <Box key={`${categoryKey}-${iconGroups[0][0]}`} sx={{ mb: 2 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'white',
                mb: 0.5,
                display: 'block',
                fontSize: '0.7rem',
                opacity: 0.7,
                letterSpacing: '0.5px',
                width: '100%',
                wordWrap: 'break-word'
              }}
            >
              {label}
            </Typography>
            {iconGroups.map((icons, groupIndex) => (
              <IconGrid key={groupIndex} sx={{ mb: groupIndex < iconGroups.length - 1 ? 1 : 0 }}>
                {icons.map((iconName) => {
                const icon = POI_ICONS.find(i => i.name === iconName);
                if (!icon) return null;
                const category = POI_CATEGORIES[categoryKey as POICategory];
                const iconColor = icon.style?.color || category.color;
                return (
                  <IconGridItem
                    key={icon.name}
                    selected={selectedIcon === icon.name}
                    onClick={() => {
                      onIconSelect(icon.name);
                      startDrag(icon.name, categoryKey as POICategory);
                    }}
                    onMouseEnter={() => setHoveredIcon(icon.name)}
                    onMouseLeave={() => setHoveredIcon(null)}
                    sx={{ 
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
                    }}
                  >
                    <i className={ICON_PATHS[icon.name]} style={{ fontSize: '12px', color: 'white' }} />
                    {hoveredIcon === icon.name && (
                      <StyledTooltip>
                        {icon.label}
                      </StyledTooltip>
                    )}
                  </IconGridItem>
                );
                })}
              </IconGrid>
            ))}
          </Box>
        );
      })}

      <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
        <Button 
          variant="text" 
          color="inherit" 
          onClick={onBack}
          fullWidth
        >
          Back
        </Button>
      </div>
    </>
  );
};

export default POIIconSelection;
