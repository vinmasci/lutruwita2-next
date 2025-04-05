import React from 'react';
import { Box, Typography } from '@mui/material';
import { getMapOverviewData } from '../../../presentation/store/mapOverviewStore';
import { useRouteContext } from '../../../map/context/RouteContext';

export const PresentationMapOverviewContent = () => {
  const mapOverview = getMapOverviewData();
  const { currentLoadedState } = useRouteContext();

  // If there's a map overview description, display it
  if (mapOverview?.description) {
    return (
      <Box 
        sx={{
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'normal'
        }}
        dangerouslySetInnerHTML={{
          __html: mapOverview.description
        }}
      />
    );
  }

  // If no map overview, display metadata from the route
  return (
    <Box sx={{ color: 'white' }}>
      {/* Route title as heading */}
      <Typography 
        variant="h4" 
        sx={{ 
          color: '#2196f3', // Material UI Blue
          fontWeight: 500,
          mb: 1,
          fontFamily: 'Futura'
        }}
      >
        {currentLoadedState?.name || 'Untitled Route'}
      </Typography>
      
      {/* Location info */}
      <Box sx={{ mb: 2 }}>
        {currentLoadedState?.routeSummary?.states?.length > 0 && (
          <Typography variant="body1" sx={{ mb: 0.5 }}>
            <strong style={{ color: '#2196f3' }}>State: </strong>
            {currentLoadedState.routeSummary.states.join(', ')}
          </Typography>
        )}
        
        {currentLoadedState?.routeSummary?.lgas?.length > 0 && (
          <Typography variant="body1" sx={{ mb: 0.5 }}>
            <strong style={{ color: '#2196f3' }}>Region: </strong>
            {currentLoadedState.routeSummary.lgas.join(', ')}
          </Typography>
        )}
      </Box>
      
      {/* Stats in a grid layout */}
      <Box 
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
          mb: 2
        }}
      >
        {/* Distance stat */}
        <Box>
          <Typography variant="body1" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
            Distance
          </Typography>
          <Typography variant="body1">
            {currentLoadedState?.routeSummary?.totalDistance 
              ? `${currentLoadedState.routeSummary.totalDistance} km` 
              : 'N/A'}
          </Typography>
        </Box>
        
        {/* Elevation Gain stat */}
        <Box>
          <Typography variant="body1" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
            Elevation Gain
          </Typography>
          <Typography variant="body1">
            {currentLoadedState?.routeSummary?.totalAscent 
              ? `${currentLoadedState.routeSummary.totalAscent} m` 
              : 'N/A'}
          </Typography>
        </Box>
        
        {/* Unpaved percentage */}
        <Box>
          <Typography variant="body1" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
            Unpaved
          </Typography>
          <Typography variant="body1">
            {currentLoadedState?.routeSummary?.unpavedPercentage !== undefined 
              ? `${currentLoadedState.routeSummary.unpavedPercentage}%` 
              : 'N/A'}
          </Typography>
        </Box>
        
        {/* Route type */}
        <Box>
          <Typography variant="body1" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
            Route Type
          </Typography>
          <Typography variant="body1">
            {currentLoadedState?.routeSummary?.isLoop 
              ? 'Loop' 
              : 'Point to Point'}
          </Typography>
        </Box>
      </Box>
      
      {/* File info */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
          Type
        </Typography>
        <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
          {currentLoadedState?.type || 'Bikepacking'}
        </Typography>
      </Box>
    </Box>
  );
};
