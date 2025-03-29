import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, Box, Grid, Card, CardContent, 
  Chip, Avatar, Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { styled } from '@mui/material/styles';
import { Route, Mountain, MoreHorizontal } from 'lucide-react';
import { ImageSlider } from '../ImageSlider/ImageSlider';
import { FilterCard } from './FilterCard';

// Map state abbreviations
const STATE_ABBREVIATIONS = {
  'Victoria': 'VIC',
  'Tasmania': 'TAS',
  'New South Wales': 'NSW',
  'Western Australia': 'WA',
  'South Australia': 'SA',
  'Australian Capital Territory': 'ACT',
  'Northern Territory': 'NT',
  'Queensland': 'QLD'
};

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4]
  }
}));

const MapPreviewWrapper = styled(Box)({
  position: 'relative',
  paddingTop: '56.25%', // 16:9 aspect ratio
  '& > *': {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  }
});

const StatsItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  color: theme.palette.text.secondary,
  '& svg': {
    color: theme.palette.info.main
  }
}));

// Location display component that uses route metadata
const LocationDisplay = ({ route }) => {
  // Get location data from metadata
  const state = route.metadata?.state || 'Unknown';
  const stateAbbr = STATE_ABBREVIATIONS[state] || state;
  
  // Get only the first LGA if there are multiple (comma-separated)
  let lga = 'Unknown';
  if (route.metadata?.lga) {
    // Split by comma and take the first one
    lga = route.metadata.lga.split(',')[0].trim();
  }
  
  return (
    <Typography 
      variant="caption" 
      color="text.secondary" 
      sx={{ fontFamily: 'Montserrat', fontSize: '0.7rem' }}
    >
      {`${lga}, ${stateAbbr}, AU`}
    </Typography>
  );
};

// Utility functions for route statistics
export const calculateTotalDistance = (routes) => {
  return Math.round(routes
    .filter(r => r.statistics?.totalDistance)
    .reduce((total, r) => total + r.statistics.totalDistance, 0) / 1000)
    .toLocaleString();
};

export const calculateTotalElevation = (routes) => {
  return Math.round(routes
    .filter(r => r.statistics?.elevationGain)
    .reduce((total, r) => total + r.statistics.elevationGain, 0))
    .toLocaleString();
};

// Calculate percentage of unpaved surface
export const calculateUnpavedPercentage = (route) => {
  // Check if we have the metadata field first
  if (route.metadata && route.metadata.unpavedPercentage !== undefined) {
    return route.metadata.unpavedPercentage;
  }
  
  // Fallback to calculation from routes if metadata is not available
  try {
    const totalDistance = route.routes
      .filter(r => r.statistics?.totalDistance)
      .reduce((total, r) => total + r.statistics.totalDistance, 0);
    
    if (!totalDistance) return 0;
    
    // If we have surface types, calculate from there
    let unpavedPercentage = 0;
    
    // Check if any route has surface types
    const hasSurfaceTypes = route.routes.some(r => 
      r.surface && r.surface.surfaceTypes && r.surface.surfaceTypes.length > 0
    );
    
    if (hasSurfaceTypes) {
      let totalUnpavedDistance = 0;
      let totalRouteDistance = 0;
      
      route.routes.forEach(r => {
        if (r.surface && r.surface.surfaceTypes) {
          r.surface.surfaceTypes.forEach(surface => {
            if (surface.type && surface.type.toLowerCase().includes('unpaved')) {
              totalUnpavedDistance += surface.distance || 0;
            }
            totalRouteDistance += surface.distance || 0;
          });
        }
      });
      
      if (totalRouteDistance > 0) {
        unpavedPercentage = Math.round((totalUnpavedDistance / totalRouteDistance) * 100);
      }
    } else {
      // If no surface data, use a default percentage (10%)
      unpavedPercentage = 10;
    }
    
    return unpavedPercentage;
  } catch (error) {
    console.error('Error calculating unpaved percentage:', error);
    return 0;
  }
};

// Limit the number of photos to display per card
const MAX_PHOTOS_PER_CARD = 3;

export const RouteCard = ({ route }) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const cardRef = useRef(null);
  
  // Limit the number of photos to improve performance
  const limitedPhotos = useMemo(() => {
    if (!route.photos || route.photos.length === 0) return [];
    return route.photos.slice(0, MAX_PHOTOS_PER_CARD);
  }, [route.photos]);
  
  // Use Intersection Observer to detect when the card is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, disconnect the observer
          observer.disconnect();
          
          // Mark as loaded after a short delay to allow for rendering
          setTimeout(() => {
            setIsLoaded(true);
          }, 100);
        }
      },
      {
        root: null, // viewport
        rootMargin: '200px', // Load a bit before it comes into view
        threshold: 0.1 // Trigger when 10% of the element is visible
      }
    );
    
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);
  
  return (
    <Grid item xs={12} sm={6} md={3}>
      <StyledCard 
        ref={cardRef}
        onClick={() => navigate(`/preview/route/${route.persistentId}`)} 
        sx={{ cursor: 'pointer' }}
      >
        <MapPreviewWrapper>
          {isVisible ? (
            <ImageSlider 
              mapPreviewProps={{
                center: route.mapState.center, 
                zoom: route.mapState.zoom, 
                routes: route.routes 
              }}
              photos={limitedPhotos}
              maxPhotos={MAX_PHOTOS_PER_CARD}
            />
          ) : (
            // Placeholder while loading
            <Box 
              sx={{ 
                width: '100%', 
                height: '100%', 
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Loading...
              </Typography>
            </Box>
          )}
        </MapPreviewWrapper>
        <CardContent sx={{ padding: '12px 8px' }}>
          {/* Route name */}
          <Typography variant="subtitle1" sx={{ fontFamily: 'Montserrat', fontWeight: 'bold', fontSize: '0.95rem', mb: 0.5 }}>
            {route.name}
          </Typography>
          
          {/* Location info using metadata */}
          <LocationDisplay route={route} />
          
          {/* Route stats with Lucide icons */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1, mb: 1 }}>
            {/* Distance with Route icon */}
            <StatsItem>
              <Route size={14} strokeWidth={2} />
              <Typography variant="caption" sx={{ fontFamily: 'Montserrat', fontSize: '0.7rem' }}>
                {route.metadata?.totalDistance !== undefined ? 
                  route.metadata.totalDistance.toLocaleString() : 
                  calculateTotalDistance(route.routes)}km
              </Typography>
            </StatsItem>
            
            {/* Elevation with Mountain icon */}
            <StatsItem>
              <Mountain size={14} strokeWidth={2} />
              <Typography variant="caption" sx={{ fontFamily: 'Montserrat', fontSize: '0.7rem' }}>
                {route.metadata?.totalAscent !== undefined ? 
                  route.metadata.totalAscent.toLocaleString() : 
                  calculateTotalElevation(route.routes)}m
              </Typography>
            </StatsItem>
            
            {/* Unpaved with MoreHorizontal icon */}
            <StatsItem>
              <MoreHorizontal size={14} strokeWidth={2} />
              <Typography variant="caption" sx={{ fontFamily: 'Montserrat', fontSize: '0.7rem' }}>
                {route.metadata?.unpavedPercentage !== undefined ? 
                  route.metadata.unpavedPercentage : 
                  calculateUnpavedPercentage(route)}% unpaved
              </Typography>
            </StatsItem>
          </Box>
          
          {/* User info */}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Avatar 
              src={route.createdBy?.avatar} 
              sx={{ width: 20, height: 20, mr: 0.5 }}
            >
              <PersonIcon fontSize="small" />
            </Avatar>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Montserrat', fontSize: '0.7rem' }}>
              {route.createdBy?.name || "Anonymous"}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 1 }} />
          
          {/* Footer info */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
            {/* Route type - blue chip */}
            <Chip
              label={route.type.charAt(0).toUpperCase() + route.type.slice(1)}
              size="small"
              sx={{ 
                bgcolor: '#2196f3', // Material UI blue
                color: 'white',
                fontFamily: 'Montserrat',
                fontWeight: 'bold',
                fontSize: '0.7rem',
                height: '22px'
              }}
            />
            
            {/* Views and date */}
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Montserrat', fontSize: '0.65rem' }}>
              {route.viewCount} views
            </Typography>
          </Box>
          
          {/* Metadata is used for filtering but not displayed */}
        </CardContent>
      </StyledCard>
    </Grid>
  );
};

export const RouteCardGrid = ({ routes }) => {
  return (
    <Grid container spacing={4}>
      {routes.map((route) => (
        <RouteCard key={route.id} route={route} />
      ))}
    </Grid>
  );
};

// Combined grid that includes the filter card as the first item
export const CombinedRouteCardGrid = ({ 
  routes,
  searchTerm, setSearchTerm,
  selectedState, setSelectedState,
  selectedRegion, setSelectedRegion,
  selectedMapTypes, setSelectedMapTypes,
  surfaceType, setSurfaceType,
  distanceFilter, setDistanceFilter,
  routeTypeFilter, setRouteTypeFilter,
  availableStates,
  availableRegions,
  availableMapTypes,
  handleMapTypeToggle
}) => {
  return (
    <Grid container spacing={4}>
      {/* Filter card as the first item */}
      <Grid item xs={12} sm={6} md={3}>
        <FilterCard
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedState={selectedState}
          setSelectedState={setSelectedState}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          selectedMapTypes={selectedMapTypes}
          setSelectedMapTypes={setSelectedMapTypes}
          surfaceType={surfaceType}
          setSurfaceType={setSurfaceType}
          distanceFilter={distanceFilter}
          setDistanceFilter={setDistanceFilter}
          routeTypeFilter={routeTypeFilter}
          setRouteTypeFilter={setRouteTypeFilter}
          availableStates={availableStates}
          availableRegions={availableRegions}
          availableMapTypes={availableMapTypes}
          handleMapTypeToggle={handleMapTypeToggle}
        />
      </Grid>
      
      {/* Route cards */}
      {routes.map((route) => (
        <RouteCard key={route.id} route={route} />
      ))}
    </Grid>
  );
};
