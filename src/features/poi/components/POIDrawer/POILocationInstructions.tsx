import React from 'react';
import { Button, Typography } from '@mui/material';
import { MousePointer2, MapPin } from 'lucide-react';
import { POILocationInstructionsProps } from './types';
import { InstructionsBox, InstructionsText } from './POIDrawer.styles';

import { useMapContext } from '../../../map/context/MapContext';

const POILocationInstructions: React.FC<POILocationInstructionsProps> = ({ mode, onCancel }) => {
  const { isPoiPlacementMode } = useMapContext();
  const instructions = {
    map: {
      title: 'Select Location',
      icon: <MousePointer2 size={24} />,
      steps: [
        'Click anywhere on the map to place your POI',
        'The cursor will change to a crosshair',
        'Click to confirm the location'
      ]
    },
    place: {
      title: 'Select Place',
      icon: <MapPin size={24} />,
      steps: [
        'Find a place name on the map',
        'Click the place name text',
        'The POI will be attached to the selected place'
      ]
    }
  };

  const currentInstructions = instructions[mode];

  return (
    <>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {currentInstructions.icon}
        {currentInstructions.title}
      </Typography>

      <InstructionsBox>
        {currentInstructions.steps.map((step, index) => (
          <InstructionsText key={index} variant="body2">
            {index + 1}. {step}
          </InstructionsText>
        ))}
      </InstructionsBox>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {mode === 'map' 
          ? isPoiPlacementMode
            ? 'Click anywhere on the map to place your point of interest.'
            : 'Choose a precise location on the map for your point of interest.'
          : 'Select a place name to attach one or more points of interest.'}
      </Typography>

      <Button 
        variant="text" 
        color="inherit" 
        onClick={onCancel}
        fullWidth
      >
        Cancel Selection
      </Button>
    </>
  );
};

export default POILocationInstructions;
