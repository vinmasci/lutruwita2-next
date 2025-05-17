import React from 'react';
import { 
  Card, CardContent, CardMedia, Typography, Box, 
  Chip, CardActionArea, Skeleton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import TerrainIcon from '@mui/icons-material/Terrain';
import RoadIcon from '@mui/icons-material/StraightenOutlined';
import ForestIcon from '@mui/icons-material/Forest';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[6],
  },
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
}));

const CardMediaStyled = styled(CardMedia)({
  height: 200,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  position: 'relative',
});

const StatsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
  flexWrap: 'wrap',
}));

const StatChip = styled(Chip)(({ theme }) => ({
  height: 24,
  fontSize: '0.75rem',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: theme.palette.text.primary,
  '& .MuiChip-icon': {
    color: theme.palette.text.secondary,
  },
}));

const TypeBadge = styled(Box)(({ theme, type }) => {
  // Define colors based on route type
  const colors = {
    tourism: '#4caf50', // Green
    event: '#f44336',   // Red
    bikepacking: '#ff9800', // Orange
    single: '#2196f3',  // Blue
    default: '#9e9e9e'  // Grey
  };
  
  const color = colors[type?.toLowerCase()] || colors.default;
  
  return {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    backgroundColor: color,
    color: '#fff',
    padding: '2px 8px',
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.75rem',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  };
});


/**
 * Format distance to a human-readable string
 * @param {number} distance - Distance (could be in meters or kilometers)
 * @param {boolean} isFirebaseData - Whether the data is from Firebase (likely in km)
 * @returns {string} - Formatted distance
 */
const formatDistance = (distance, isFirebaseData = false) => {
  if (distance === undefined || distance === null) return 'N/A';
  
  // For Firebase data, assume the distance is already in kilometers
  let km = isFirebaseData ? distance : distance / 1000;
  
  // Format with 1 decimal place if less than 10km, otherwise round to nearest km
  return km < 10 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`;
};

/**
 * Format elevation in meters to a human-readable string
 * @param {number} meters - Elevation in meters
 * @returns {string} - Formatted elevation
 */
const formatElevation = (meters) => {
  if (meters === undefined || meters === null) return 'N/A';
  
  // Round to nearest meter
  return `${Math.round(meters)}m`;
};

/**
 * Get a surface type icon based on unpaved percentage
 * @param {number} unpavedPercentage - The unpaved percentage (0-100)
 * @returns {JSX.Element} - The icon component
 */
const getSurfaceIcon = (unpavedPercentage) => {
  if (unpavedPercentage >= 60) {
    return <ForestIcon fontSize="small" />;
  } else if (unpavedPercentage >= 10) {
    return <TerrainIcon fontSize="small" />;
  } else {
    return <RoadIcon fontSize="small" />;
  }
};

/**
 * Get a surface type label based on unpaved percentage
 * @param {number} unpavedPercentage - The unpaved percentage (0-100)
 * @param {boolean} includePercentage - Whether to include the percentage in the label
 * @returns {string} - The surface type label
 */
const getSurfaceLabel = (unpavedPercentage, includePercentage = true) => {
  let label;
  if (unpavedPercentage >= 60) {
    label = 'Unpaved';
  } else if (unpavedPercentage >= 10) {
    label = 'Mixed';
  } else {
    label = 'Road';
  }
  
  // Include the percentage if requested
  if (includePercentage && unpavedPercentage !== undefined) {
    return `${label} (${unpavedPercentage}%)`;
  }
  
  return label;
};

/**
 * Route card component that displays a route with its details
 * @param {Object} props - Component props
 * @param {Object} props.route - The route object
 * @returns {JSX.Element} - The component
 */
export const FirebaseRouteCard = ({ route }) => {
  const navigate = useNavigate();
  
  // Debug logging
  console.log('FirebaseRouteCard - route:', route);
  
  // Extract data from the Firebase structure
  const name = route.name;
  const type = route.routeType;
  const thumbnailUrl = route.thumbnailUrl;
  const persistentId = route.id;
  
  // Handle click to navigate to the route
  const handleClick = () => {
    navigate(`/route/${persistentId}`);
  };
  
  return (
    <StyledCard>
      <CardActionArea onClick={handleClick} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <CardMediaStyled
          image={thumbnailUrl || '/placeholder-map.jpg'}
          title={name}
        >
          {type && <TypeBadge type={type}>{type}</TypeBadge>}
        </CardMediaStyled>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" component="h2" gutterBottom noWrap>
            {name || 'Unnamed Route'}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {(() => {
              // Get states from statistics or top level
              const states = route.statistics?.states?.length > 0 
                ? route.statistics.states 
                : (route.states?.length > 0 ? route.states : []);
              
              // Get countries from statistics or top level
              const countries = route.statistics?.countries?.length > 0 
                ? route.statistics.countries 
                : (route.countries?.length > 0 ? route.countries : []);
              
              // If we have both states and countries, show states + country
              if (states.length > 0 && countries.length > 0) {
                return `${states.join(', ')}, ${countries[0]}`;
              }
              // If we only have states, show them
              else if (states.length > 0) {
                return states.join(', ');
              }
              // If we only have countries, show them
              else if (countries.length > 0) {
                return countries.join(', ');
              }
              // Otherwise, show not specified
              else {
                return 'Location not specified';
              }
            })()}
          </Typography>
          
          <StatsContainer>
            {/* Distance */}
            {(route.statistics?.totalDistance !== undefined || route.totalDistance !== undefined) && (
              <StatChip
                icon={<DirectionsBikeIcon fontSize="small" />}
                label={formatDistance(route.statistics?.totalDistance !== undefined ? 
                  route.statistics.totalDistance : route.totalDistance, true)}
                size="small"
              />
            )}
            
            {/* Elevation */}
            {(route.statistics?.totalAscent !== undefined || route.totalAscent !== undefined) && (
              <StatChip
                icon={<TerrainIcon fontSize="small" />}
                label={formatElevation(route.statistics?.totalAscent !== undefined ? 
                  route.statistics.totalAscent : route.totalAscent)}
                size="small"
              />
            )}
            
            {/* Unpaved percentage */}
            {(route.statistics?.unpavedPercentage !== undefined || route.unpavedPercentage !== undefined) && (
              <StatChip
                icon={getSurfaceIcon(route.statistics?.unpavedPercentage !== undefined ? 
                  route.statistics.unpavedPercentage : route.unpavedPercentage)}
                label={getSurfaceLabel(route.statistics?.unpavedPercentage !== undefined ? 
                  route.statistics.unpavedPercentage : route.unpavedPercentage)}
                size="small"
              />
            )}
          </StatsContainer>
        </CardContent>
      </CardActionArea>
    </StyledCard>
  );
};

/**
 * Skeleton card for loading state
 * @returns {JSX.Element} - The skeleton component
 */
export const RouteCardSkeleton = () => {
  return (
    <StyledCard>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton variant="text" width="80%" height={32} />
        <Skeleton variant="text" width="60%" height={24} />
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Skeleton variant="rectangular" width={60} height={24} />
          <Skeleton variant="rectangular" width={60} height={24} />
          <Skeleton variant="rectangular" width={60} height={24} />
        </Box>
      </CardContent>
    </StyledCard>
  );
};

export default FirebaseRouteCard;
