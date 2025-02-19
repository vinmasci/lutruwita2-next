import React from 'react';
import { Typography } from '@mui/material';
import { MapPin, MapPinned } from 'lucide-react';
import { POIModeSelectionProps } from './types';
import { ModeSelectionCard } from './POIDrawer.styles';

const POIModeSelection: React.FC<POIModeSelectionProps> = ({ onModeSelect }) => {
  return (
    <>
      <Typography variant="h6" gutterBottom sx={{ width: '100%', wordWrap: 'break-word' }}>
        Add Point of Interest
      </Typography>
      
      <ModeSelectionCard onClick={() => onModeSelect('regular')}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%', overflow: 'hidden' }}>
          <MapPin size={24} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" sx={{ wordWrap: 'break-word' }}>Add POI to Map</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ wordWrap: 'break-word' }}>
              Click anywhere on the map to place a POI
            </Typography>
          </div>
        </div>
      </ModeSelectionCard>

      <ModeSelectionCard onClick={() => onModeSelect('place')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MapPinned size={24} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" sx={{ wordWrap: 'break-word' }}>Add POI to Place</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ wordWrap: 'break-word' }}>
              Click a place name to attach POIs
            </Typography>
          </div>
        </div>
      </ModeSelectionCard>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, width: '100%', wordWrap: 'break-word' }}>
        Select how you want to add your point of interest. You can either place it anywhere on the map or attach it to an existing place name.
      </Typography>
    </>
  );
};

export default POIModeSelection;
