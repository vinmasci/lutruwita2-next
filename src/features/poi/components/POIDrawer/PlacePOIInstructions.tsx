import React from 'react';
import { Typography } from '@mui/material';
import { Info } from 'lucide-react';

export const PlacePOIInstructions: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-4 text-center">
    <Info className="w-12 h-12 mb-4 text-muted-foreground" />
    <Typography variant="h6" className="mb-2">
      Hover Over a Place Name
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Move your cursor over any city, town, or village name on the map to add POIs to that location.
    </Typography>
  </div>
);

export default PlacePOIInstructions;
