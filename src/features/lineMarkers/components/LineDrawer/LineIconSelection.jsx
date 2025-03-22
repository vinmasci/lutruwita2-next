import React from 'react';
import { Typography, Box, Divider } from '@mui/material';
import { LINE_ICONS, getIconsByCategory } from '../../constants/line-icons.js';
import { LINE_ICON_PATHS } from '../../constants/line-icons.js';
import { IconGrid, IconGridItem, StyledTooltip } from './LineDrawer.styles.js';

const LineIconSelection = ({ selectedIcons, onIconSelect }) => {
  const [hoveredIcon, setHoveredIcon] = React.useState(null);

  const renderIcon = (icon) => {
    const isSelected = selectedIcons.includes(icon.name);
    
    return (
      <IconGridItem
        key={icon.name}
        selected={isSelected}
        onClick={() => {
          if (isSelected) {
            onIconSelect(selectedIcons.filter(name => name !== icon.name));
          } else {
            onIconSelect([...selectedIcons, icon.name]);
          }
        }}
        onMouseEnter={() => setHoveredIcon(icon.name)}
        onMouseLeave={() => setHoveredIcon(null)}
        sx={{
          position: 'relative',
          width: '24px',
          height: '24px',
          backgroundColor: '#333333', // Dark background for all icons
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': {
            transform: 'scale(1.1)'
          }
        }}
      >
        <i 
          className={LINE_ICON_PATHS[icon.name]} 
          style={{ fontSize: '14px', color: 'white' }} 
        />
        {hoveredIcon === icon.name && (
          <StyledTooltip>{icon.label}</StyledTooltip>
        )}
      </IconGridItem>
    );
  };

  // Define categories and their labels
  const categories = [
    { id: 'accommodation', label: 'Accommodation' },
    { id: 'food-drink', label: 'Food & Drink' },
    { id: 'town-services', label: 'Town Services' },
    { id: 'transportation', label: 'Transportation' },
    { id: 'event-information', label: 'Event Information' }
  ];

  // Render a category of icons
  const renderCategory = (category) => {
    const categoryIcons = getIconsByCategory(category.id);
    
    if (categoryIcons.length === 0) return null;
    
    return (
      <Box key={category.id} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          {category.label}
        </Typography>
        <IconGrid>
          {categoryIcons.map(renderIcon)}
        </IconGrid>
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Icons (Optional)
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Select icons to display at the end of the line.
      </Typography>
      
      <Box sx={{ maxHeight: '400px', overflowY: 'auto', pr: 1 }}>
        {categories.map(renderCategory)}
      </Box>
    </Box>
  );
};

export default LineIconSelection;
