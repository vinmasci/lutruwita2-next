import React from 'react';
import { Typography, Box } from '@mui/material';
import { DirectionGrid, DirectionButton } from './TextboxTabsDrawer.styles';
import { TabPointerDirections } from '../../context/TextboxTabsContext';

// Component to select the pointer direction
const DirectionSelector = ({ selectedDirection, onDirectionSelect }) => {
  // Direction options with their labels
  const directions = [
    { value: TabPointerDirections.TOP_LEFT, label: '↖' },
    { value: TabPointerDirections.TOP, label: '↑' },
    { value: TabPointerDirections.TOP_RIGHT, label: '↗' },
    { value: TabPointerDirections.LEFT, label: '←' },
    { value: null, label: '•' }, // Center (no pointer)
    { value: TabPointerDirections.RIGHT, label: '→' },
    { value: TabPointerDirections.BOTTOM_LEFT, label: '↙' },
    { value: TabPointerDirections.BOTTOM, label: '↓' },
    { value: TabPointerDirections.BOTTOM_RIGHT, label: '↘' },
  ];

  return (
    <Box>
      <DirectionGrid>
        {directions.map((direction) => (
          <DirectionButton
            key={direction.value || 'center'}
            selected={selectedDirection === direction.value}
            onClick={() => direction.value && onDirectionSelect(direction.value)}
            sx={{ 
              cursor: direction.value ? 'pointer' : 'default',
              opacity: direction.value ? 1 : 0.5
            }}
          >
            {direction.label}
          </DirectionButton>
        ))}
      </DirectionGrid>
    </Box>
  );
};

export default DirectionSelector;
