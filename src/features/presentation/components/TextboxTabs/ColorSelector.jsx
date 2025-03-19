import React from 'react';
import { Typography, Box } from '@mui/material';
import { ColorGrid, ColorButton } from './TextboxTabsDrawer.styles';
import { TabColors } from '../../context/TextboxTabsContext';

// Component to select the background color
const ColorSelector = ({ selectedColor, onColorSelect }) => {
  // Color options with their labels
  const colors = [
    { value: TabColors.DEFAULT, label: 'Default' },
    { value: TabColors.ROAD, label: 'Road' },
    { value: TabColors.FOOD, label: 'Food' },
    { value: TabColors.WATER, label: 'Water' },
    { value: TabColors.EVENT, label: 'Event' },
    { value: TabColors.HC_CLIMB, label: 'HC Climb' },
    { value: TabColors.CAT1_CLIMB, label: 'Cat 1' },
    { value: TabColors.CAT2_CLIMB, label: 'Cat 2' },
    { value: TabColors.WHITE, label: 'White' },
    { value: TabColors.CAT4_CLIMB, label: 'Cat 4' }
  ];

  return (
    <Box>
      <ColorGrid>
        {colors.map((color) => (
          <ColorButton
            key={color.value}
            color={color.value}
            selected={selectedColor === color.value}
            onClick={() => onColorSelect(color.value)}
            title={color.label}
          />
        ))}
      </ColorGrid>
    </Box>
  );
};

export default ColorSelector;
