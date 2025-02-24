import React from 'react';
import { Box } from '@mui/material';
import { POIMarkerProps } from './types';

export const POIMarker: React.FC<POIMarkerProps> = ({ poi, onClick }) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: 24,
        height: 24,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover': {
          transform: 'scale(1.1)',
        }
      }}
    >
      <i className={`fa-solid fa-${poi.icon}`} style={{ fontSize: '24px', color: poi.style?.color || '#0288d1' }} />
    </Box>
  );
};

export default POIMarker;
