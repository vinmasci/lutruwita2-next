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
      <Typography variant="h6" gutterBottom>
        {mode === 'map' ? 'Choose POI Type' : 'Select POI Types'}
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        {mode === 'map'
          ? 'Choose an icon for your point of interest.'
          : 'Select one or more icons to attach to the selected place.'}
      </Typography>

      {Object.entries(POI_CATEGORIES).map(([categoryKey, category]) => {
        const categoryIcons = POI_ICONS.filter(icon => icon.category === categoryKey);
        if (categoryIcons.length === 0) return null;
        
        return (
          <Box key={categoryKey} sx={{ mb: 3 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'white',
                mb: 1,
                display: 'block',
                fontSize: '0.7rem',
                opacity: 0.7,
                letterSpacing: '0.5px'
              }}
            >
              {category.label}
            </Typography>
            <IconGrid>
              {categoryIcons.map((icon) => {
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
                      width: '28px',
                      height: '28px',
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
                    <i className={ICON_PATHS[icon.name]} style={{ fontSize: '16px', color: 'white' }} />
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
