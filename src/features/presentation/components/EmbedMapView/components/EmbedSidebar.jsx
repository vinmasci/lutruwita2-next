import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { 
  List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Tooltip, Divider, IconButton 
} from '@mui/material';
import { filterPhotosByRoute } from '../hooks/useRouteDataLoader';
import { calculateElevationGained, calculateElevationLost } from '../utils/elevationUtils';

import { 
  ListOrdered, Camera, CameraOff, Ruler, AlertTriangle, 
  Tent, Coffee, Mountain, Building, Bus, MapPinCheck, FlagTriangleRight,
  Settings2, Eye, EyeOff, PowerOff, CirclePower
} from 'lucide-react';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import { StyledDrawer, NestedDrawer } from '../../PresentationSidebar/PresentationSidebar.styles';

// Enhanced sidebar component that mimics PresentationSidebar without using contexts
const EmbedSidebar = ({ 
  isOpen, 
  isDistanceMarkersVisible, 
  toggleDistanceMarkersVisibility,
  routeData,
  currentRoute,
  setCurrentRoute,
  isPhotosVisible,
  togglePhotosVisibility,
  isClimbFlagsVisible,
  toggleClimbFlagsVisibility,
  isLineMarkersVisible,
  toggleLineMarkersVisibility,
  visiblePOICategories,
  togglePOICategoryVisibility,
  routeVisibility,
  toggleRouteVisibility,
  map
}) => {
  const [isNestedOpen, setIsNestedOpen] = useState(true);
  const [allComponentsDisabled, setAllComponentsDisabled] = useState(false);
  const [previouslyVisiblePOICategories, setPreviouslyVisiblePOICategories] = useState([]);
  
  // Get all routes from routeData
  const routes = routeData?.routes || [];
  
  // Find current route index
  const currentIndex = routes.findIndex(route => 
    route.routeId === (currentRoute?.routeId || currentRoute?.id)
  );
  
  // Handle navigation between routes
  const handleNavigate = (direction) => {
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < routes.length) {
      const nextRoute = routes[nextIndex];
      
      // Calculate or extract total distance
      let totalDistance = 0;
      
      // Try to get total distance from various sources
      if (nextRoute.statistics && nextRoute.statistics.totalDistance) {
        totalDistance = nextRoute.statistics.totalDistance;
      } else if (nextRoute.surface && nextRoute.surface.elevationProfile && nextRoute.surface.elevationProfile.length > 0) {
        const lastPoint = nextRoute.surface.elevationProfile[nextRoute.surface.elevationProfile.length - 1];
        if (lastPoint && lastPoint.distance) {
          totalDistance = lastPoint.distance;
        }
      } else if (nextRoute.geojson?.features?.[0]?.properties?.distance) {
        totalDistance = nextRoute.geojson.features[0].properties.distance;
      } else if (nextRoute.geojson?.features?.[0]?.geometry?.coordinates) {
        const coordinates = nextRoute.geojson.features[0].geometry.coordinates;
        for (let i = 1; i < coordinates.length; i++) {
          const dx = coordinates[i][0] - coordinates[i-1][0];
          const dy = coordinates[i][1] - coordinates[i-1][1];
          totalDistance += Math.sqrt(dx*dx + dy*dy) * 111000; // Rough conversion to meters
        }
      } else {
        totalDistance = 10000; // Fallback to 10km
      }
      
      // Create enhanced route with all necessary data
      const enhancedRoute = {
        ...nextRoute,
        id: nextRoute.routeId,
        visible: true,
        description: {
          description: nextRoute.description?.description || nextRoute.description || '',
          title: nextRoute.description?.title || '',
          photos: nextRoute.description?.photos?.length > 0 
            ? nextRoute.description.photos 
            : filterPhotosByRoute(routeData?.photos?.map(photo => ({
                ...photo,
                id: photo.id || photo._id,
                url: photo.url,
                thumbnailUrl: photo.thumbnailUrl || photo.url,
                coordinates: photo.coordinates
            })) || [], nextRoute)
        },
        statistics: {
          totalDistance: totalDistance,
          elevationGained: calculateElevationGained(nextRoute),
          elevationLost: calculateElevationLost(nextRoute),
          // Add aliases for compatibility with different naming conventions
          elevationGain: calculateElevationGained(nextRoute),
          elevationLoss: calculateElevationLost(nextRoute)
        }
      };
      
      // Ensure geojson has the required structure
      if (enhancedRoute.geojson && enhancedRoute.geojson.features && enhancedRoute.geojson.features.length > 0) {
        // Make sure properties exists
        if (!enhancedRoute.geojson.features[0].properties) {
          enhancedRoute.geojson.features[0].properties = {};
        }
        
        // Make sure coordinateProperties exists
        if (!enhancedRoute.geojson.features[0].properties.coordinateProperties) {
          enhancedRoute.geojson.features[0].properties.coordinateProperties = {};
        }
        
        // Add elevation data from surface.elevationProfile if available
        if (nextRoute.surface && nextRoute.surface.elevationProfile && nextRoute.surface.elevationProfile.length > 0) {
          // Extract just the elevation values
          const elevations = nextRoute.surface.elevationProfile.map(point => point.elevation);
          enhancedRoute.geojson.features[0].properties.coordinateProperties.elevation = elevations;
        }
      }
      
      // Set the enhanced route as current route
      setCurrentRoute(enhancedRoute);
      
      // Update map view if needed
      if (map && nextRoute.mapState) {
        const { center, zoom } = nextRoute.mapState;
        map.setCenter(center);
        map.setZoom(zoom);
      }
    }
  };

  // Toggle all components on/off
  const toggleAllComponents = () => {
    setAllComponentsDisabled(prev => !prev);
    
    // If we're enabling components, restore previous state
    // If we're disabling components, hide everything
    if (allComponentsDisabled) {
      // Re-enable components
      if (!isPhotosVisible) togglePhotosVisibility();
      if (!isDistanceMarkersVisible) toggleDistanceMarkersVisibility();
      if (!isClimbFlagsVisible) toggleClimbFlagsVisibility();
      if (!isLineMarkersVisible) toggleLineMarkersVisibility();
      
      // Directly restore previously visible POI categories
      // This prevents duplication by setting the exact state rather than toggling
      setVisiblePOICategories(previouslyVisiblePOICategories);
    } else {
      // Store currently visible categories before disabling
      setPreviouslyVisiblePOICategories([...visiblePOICategories]);
      
      // Disable all components
      if (isPhotosVisible) togglePhotosVisibility();
      if (isDistanceMarkersVisible) toggleDistanceMarkersVisibility();
      if (isClimbFlagsVisible) toggleClimbFlagsVisibility();
      if (isLineMarkersVisible) toggleLineMarkersVisibility();
      
      // Clear all POI categories
      setVisiblePOICategories([]);
    }
  };
  
  // Common style for all list item buttons to ensure consistent spacing
  const listItemButtonStyle = {
    marginTop: '8px',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)'
    },
    '&:hover .MuiListItemIcon-root svg': {
      color: '#ff4d4f'
    }
  };
  
  return (
    <>
      <StyledDrawer variant="permanent" anchor="left">
        <List>
          {/* Routes icon at the very top */}
          <Tooltip title="Routes" placement="right">
            <ListItemButton
              onClick={() => setIsNestedOpen(!isNestedOpen)}
              data-active={isNestedOpen}
              sx={{
                ...listItemButtonStyle,
                '&[data-active="true"] .MuiListItemIcon-root svg': {
                  color: '#4caf50'
                }
              }}
            >
              <ListItemIcon>
                <ListOrdered />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          <Divider sx={{ my: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          
          {/* Power toggle moved below Routes */}
          <Tooltip title={allComponentsDisabled ? "Enable All Components" : "Disable All Components"} placement="right">
            <ListItemButton
              onClick={toggleAllComponents}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                {allComponentsDisabled ? 
                  <CirclePower color="#4caf50" /> : 
                  <PowerOff color="#ff4d4f" />}
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          <Divider sx={{ my: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          
          <Tooltip title={isPhotosVisible ? "Hide Photos" : "Show Photos"} placement="right">
            <ListItemButton
              onClick={togglePhotosVisibility}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                {isPhotosVisible ? 
                  <Camera color="#4caf50" /> : 
                  <CameraOff color="#ff4d4f" />}
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          <Tooltip title={isDistanceMarkersVisible ? "Hide Distance Markers" : "Show Distance Markers"} placement="right">
            <ListItemButton
              onClick={toggleDistanceMarkersVisibility}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                <Ruler color={isDistanceMarkersVisible ? '#4caf50' : '#ff4d4f'} />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          {/* Line markers moved to be underneath distance markers */}
          <Tooltip title="Line Markers" placement="right">
            <ListItemButton
              onClick={toggleLineMarkersVisibility}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                <Settings2
                  color={isLineMarkersVisible ? '#4caf50' : '#ff4d4f'}
                />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          {/* Divider after line markers */}
          <Divider sx={{ my: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          
          {/* POI Category Toggles */}
          <Tooltip title="Road Information" placement="right">
            <ListItemButton
              onClick={() => togglePOICategoryVisibility('road-information')}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                <AlertTriangle
                  color={visiblePOICategories.includes('road-information') ? '#4caf50' : '#ff4d4f'}
                />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          <Tooltip title="Accommodation" placement="right">
            <ListItemButton
              onClick={() => togglePOICategoryVisibility('accommodation')}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                <Tent
                  color={visiblePOICategories.includes('accommodation') ? '#4caf50' : '#ff4d4f'}
                />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          <Tooltip title="Food & Drink" placement="right">
            <ListItemButton
              onClick={() => togglePOICategoryVisibility('food-drink')}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                <Coffee
                  color={visiblePOICategories.includes('food-drink') ? '#4caf50' : '#ff4d4f'}
                />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          <Tooltip title="Natural Features" placement="right">
            <ListItemButton
              onClick={() => togglePOICategoryVisibility('natural-features')}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                <Mountain
                  color={visiblePOICategories.includes('natural-features') ? '#4caf50' : '#ff4d4f'}
                />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          <Tooltip title="Town Services" placement="right">
            <ListItemButton
              onClick={() => togglePOICategoryVisibility('town-services')}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                <Building
                  color={visiblePOICategories.includes('town-services') ? '#4caf50' : '#ff4d4f'}
                />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          <Tooltip title="Transportation" placement="right">
            <ListItemButton
              onClick={() => togglePOICategoryVisibility('transportation')}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                <Bus
                  color={visiblePOICategories.includes('transportation') ? '#4caf50' : '#ff4d4f'}
                />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          <Tooltip title="Event Information" placement="right">
            <ListItemButton
              onClick={() => togglePOICategoryVisibility('event-information')}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                <MapPinCheck
                  color={visiblePOICategories.includes('event-information') ? '#4caf50' : '#ff4d4f'}
                />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
          
          <Tooltip title="Climb Flags" placement="right">
            <ListItemButton
              onClick={toggleClimbFlagsVisibility}
              sx={listItemButtonStyle}
            >
              <ListItemIcon>
                <FlagTriangleRight
                  color={isClimbFlagsVisible ? '#4caf50' : '#ff4d4f'}
                />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        </List>
      </StyledDrawer>
      
      {/* Nested drawer for routes list */}
      <NestedDrawer
        variant="persistent"
        anchor="left"
        open={isNestedOpen}
        sx={{
          '& .MuiDrawer-paper': {
            top: '64px', // Position below the header
            height: 'calc(100% - 64px)', // Adjust height to account for header
            marginLeft: '56px', // Account for the sidebar width
            paddingTop: '0px' // Remove any top padding
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2
              }}
            >
              <Typography
                variant="h5"
                component="h2"
                sx={{ fontWeight: 600, color: 'white' }}
              >
                Routes
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Previous route">
                  <span>
                    <IconButton
                      onClick={() => handleNavigate('prev')}
                      disabled={currentIndex <= 0}
                      sx={{
                        color: 'white',
                        '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' }
                      }}
                    >
                      <NavigateBeforeIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  {`${currentIndex + 1} of ${routes.length}`}
                </Typography>
                
                <Tooltip title="Next route">
                  <span>
                    <IconButton
                      onClick={() => handleNavigate('next')}
                      disabled={currentIndex >= routes.length - 1}
                      sx={{
                        color: 'white',
                        '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' }
                      }}
                    >
                      <NavigateNextIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </Box>
          
          <List sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2, pb: 40 }}>
            {routes.map((route) => (
              <ListItem
                key={route.routeId}
                sx={{
                  backgroundColor: (currentRoute?.routeId || currentRoute?.id) === route.routeId ? 'rgba(74, 158, 255, 0.15)' : 'rgba(35, 35, 35, 0.9)',
                  mb: 1.5,
                  borderRadius: 1,
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer',
                  border: (currentRoute?.routeId || currentRoute?.id) === route.routeId ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid transparent',
                  '&:hover': {
                    backgroundColor: (currentRoute?.routeId || currentRoute?.id) === route.routeId ? 'rgba(74, 158, 255, 0.2)' : 'rgba(45, 45, 45, 0.95)',
                    transform: 'scale(1.02)',
                    '& i': {
                      color: '#4a9eff !important'
                    }
                  },
                  '& i': {
                    transition: 'color 0.2s ease-in-out',
                    color: (currentRoute?.routeId || currentRoute?.id) === route.routeId ? '#4a9eff !important' : '#0288d1'
                  },
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 16px'
                }}
              >
                <div
                  style={{ flex: 1, cursor: 'pointer', minWidth: '0', width: '100%' }}
                  onClick={() => {
                    // Calculate or extract total distance
                    let totalDistance = 0;
                    
                    // Try to get total distance from various sources
                    if (route.statistics && route.statistics.totalDistance) {
                      totalDistance = route.statistics.totalDistance;
                    } else if (route.surface && route.surface.elevationProfile && route.surface.elevationProfile.length > 0) {
                      const lastPoint = route.surface.elevationProfile[route.surface.elevationProfile.length - 1];
                      if (lastPoint && lastPoint.distance) {
                        totalDistance = lastPoint.distance;
                      }
                    } else if (route.geojson?.features?.[0]?.properties?.distance) {
                      totalDistance = route.geojson.features[0].properties.distance;
                    } else if (route.geojson?.features?.[0]?.geometry?.coordinates) {
                      const coordinates = route.geojson.features[0].geometry.coordinates;
                      for (let i = 1; i < coordinates.length; i++) {
                        const dx = coordinates[i][0] - coordinates[i-1][0];
                        const dy = coordinates[i][1] - coordinates[i-1][1];
                        totalDistance += Math.sqrt(dx*dx + dy*dy) * 111000; // Rough conversion to meters
                      }
                    } else {
                      totalDistance = 10000; // Fallback to 10km
                    }
                    
                    // Create enhanced route with all necessary data
                    const enhancedRoute = {
                      ...route,
                      id: route.routeId,
                      visible: true,
                      description: {
                        description: route.description?.description || route.description || '',
                        title: route.description?.title || '',
                        photos: route.description?.photos?.length > 0 
                          ? route.description.photos 
                          : filterPhotosByRoute(routeData?.photos?.map(photo => ({
                              ...photo,
                              id: photo.id || photo._id,
                              url: photo.url,
                              thumbnailUrl: photo.thumbnailUrl || photo.url,
                              coordinates: photo.coordinates
                          })) || [], route)
                      },
                                    statistics: {
                                        totalDistance: totalDistance,
                                        elevationGained: calculateElevationGained(route),
                                        elevationLost: calculateElevationLost(route),
                                        // Add aliases for compatibility with different naming conventions
                                        elevationGain: calculateElevationGained(route),
                                        elevationLoss: calculateElevationLost(route)
                                    }
                    };
                    
                    // Ensure geojson has the required structure
                    if (enhancedRoute.geojson && enhancedRoute.geojson.features && enhancedRoute.geojson.features.length > 0) {
                      // Make sure properties exists
                      if (!enhancedRoute.geojson.features[0].properties) {
                        enhancedRoute.geojson.features[0].properties = {};
                      }
                      
                      // Make sure coordinateProperties exists
                      if (!enhancedRoute.geojson.features[0].properties.coordinateProperties) {
                        enhancedRoute.geojson.features[0].properties.coordinateProperties = {};
                      }
                      
                      // Add elevation data from surface.elevationProfile if available
                      if (route.surface && route.surface.elevationProfile && route.surface.elevationProfile.length > 0) {
                        // Extract just the elevation values
                        const elevations = route.surface.elevationProfile.map(point => point.elevation);
                        enhancedRoute.geojson.features[0].properties.coordinateProperties.elevation = elevations;
                      }
                    }
                    
                    // Set the enhanced route as current route
                    setCurrentRoute(enhancedRoute);
                  }}
                >
                  <ListItemText
                    primary={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '0' }}>
                        <div
                          style={{
                            width: '8px',
                            height: '16px',
                            backgroundColor: route.color || '#f44336',
                            borderRadius: '2px',
                            border: '1px solid rgba(255, 255, 255, 0.5)'
                          }}
                        />
                        <span>{route.name}</span>
                      </div>
                    }
                    sx={{
                      color: 'white',
                      '& .MuiTypography-root': {
                        wordWrap: 'break-word',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal'
                      }
                    }}
                    secondary={
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px',
                          fontSize: '0.75rem',
                          marginTop: '5px'
                        }}
                      >
                        {route.statistics && (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i
                                className="fa-solid fa-route"
                                style={{ color: '#4a9eff', fontSize: '0.8125rem' }}
                              />
                              <span style={{ color: 'white' }}>
                                {`${(route.statistics.totalDistance / 1000).toLocaleString(undefined, {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1
                                })}km`}
                              </span>
                            </div>
                            
                            {route.statistics.elevationGain && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                                <i
                                  className="fa-solid fa-up-right"
                                  style={{ color: '#4a9eff', fontSize: '0.8125rem' }}
                                />
                                <span style={{ color: 'white' }}>
                                  {`${Math.round(route.statistics.elevationGain).toLocaleString() || 0}m`}
                                </span>
                                <i
                                  className="fa-solid fa-down-right"
                                  style={{ color: '#4a9eff', fontSize: '0.8125rem', marginLeft: '8px' }}
                                />
                                <span style={{ color: 'white' }}>
                                  {`${Math.round(route.statistics.elevationLoss).toLocaleString() || 0}m`}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Route description removed from sidebar - now only shown in the description tab */}
                      </div>
                    }
                  />
                </div>
                
                <Tooltip
                  title={(routeVisibility[route.routeId]?.visible ?? true) ? "Hide Route" : "Show Route"}
                  placement="left"
                >
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRouteVisibility(route.routeId);
                    }}
                    size="small"
                    sx={{
                      color: 'white',
                      padding: '4px',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    {(routeVisibility[route.routeId]?.visible ?? true) ? (
                      <Eye size={18} color="#4caf50" />
                    ) : (
                      <EyeOff size={18} color="#ff4d4f" />
                    )}
                  </IconButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Box>
      </NestedDrawer>
    </>
  );
};

export default EmbedSidebar;
