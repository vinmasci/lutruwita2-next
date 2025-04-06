import React from 'react';
import { Box, Typography } from '@mui/material';
import MapOverviewContextAdapter from '../EmbedMapView/components/MapOverviewContextAdapter';
import MapOverviewLoader from './MapOverviewLoader';
import { PresentationMapOverviewContent } from './PresentationMapOverviewContent';

const PresentationMapOverviewDrawer = () => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: 'rgba(35, 35, 35, 0.8)', // Increased transparency (0.6 alpha)
      backdropFilter: 'blur(2px)', // Reduced blur effect
      fontFamily: '"Lato", sans-serif'
    }}>
      {/* Title removed as requested */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        px: 3, 
        pt: 15, // Added more top padding
        py: 2,
        pb: 120,
        color: 'white',
        fontFamily: '"Lato", sans-serif',
        '& a': {
          color: '#2196f3',
          textDecoration: 'underline',
          fontFamily: '"Lato", sans-serif'
        },
        '& *': {
          fontFamily: '"Lato", sans-serif'
        }
      }}>
        {/* Empty box to add space at the top */}
        <Box sx={{ height: '20px' }}></Box>
        
        <MapOverviewContextAdapter>
          <MapOverviewLoader />
          <PresentationMapOverviewContent />
        </MapOverviewContextAdapter>
      </Box>
    </Box>
  );
};

export default PresentationMapOverviewDrawer;
