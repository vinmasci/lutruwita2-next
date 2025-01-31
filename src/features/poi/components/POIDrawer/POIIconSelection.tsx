import React from 'react';
import { Typography, Button } from '@mui/material';
import { POIIconSelectionProps } from './types';
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconsByCategory } from '../../constants/poi-icons';
import { ICON_PATHS } from '../../constants/icon-paths';
import { 
  CategoryList, 
  CategoryItem, 
  IconGrid, 
  IconGridItem,
  StyledTooltip 
} from './POIDrawer.styles';

const POIIconSelection: React.FC<POIIconSelectionProps> = ({
  mode,
  selectedCategory,
  selectedIcon,
  onCategorySelect,
  onIconSelect,
  onBack,
  onNext,
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
          ? 'Select a category and choose an icon for your point of interest.'
          : 'Select one or more icons to attach to the selected place.'}
      </Typography>

      <CategoryList>
        {Object.entries(POI_CATEGORIES).map(([category, { label, color }]) => (
          <CategoryItem
            key={category}
            selected={selectedCategory === category}
            onClick={() => onCategorySelect(category as keyof typeof POI_CATEGORIES)}
            sx={{ borderLeft: `4px solid ${color}` }}
          >
            <Typography variant="subtitle2">{label}</Typography>
          </CategoryItem>
        ))}
      </CategoryList>

      {selectedCategory && (
        <>
          <Typography variant="subtitle2" gutterBottom>
            {POI_CATEGORIES[selectedCategory].label} Icons
          </Typography>

          <IconGrid>
            {getIconsByCategory(selectedCategory).map(({ name, label, description }) => (
              <IconGridItem
                key={name}
                selected={selectedIcon === name}
                onClick={() => {
                  onIconSelect(name);
                  if (selectedCategory) {
                    startDrag(name, selectedCategory);
                  }
                }}
                onMouseEnter={() => setHoveredIcon(name)}
                onMouseLeave={() => setHoveredIcon(null)}
                sx={{ position: 'relative' }}
              >
                <i className={ICON_PATHS[name]} style={{ fontSize: '24px' }} />
                {hoveredIcon === name && (
                  <StyledTooltip>
                    {label}
                  </StyledTooltip>
                )}
              </IconGridItem>
            ))}
          </IconGrid>
        </>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
        <Button 
          variant="text" 
          color="inherit" 
          onClick={onBack}
          fullWidth
        >
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onNext}
          disabled={!selectedIcon}
          fullWidth
        >
          Next
        </Button>
      </div>
    </>
  );
};

export default POIIconSelection;
