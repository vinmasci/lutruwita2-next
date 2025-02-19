import React, { useState, Suspense } from 'react';
import { 
  List, 
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText, 
  Box, 
  Typography, 
  IconButton,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { useRouteContext } from '../../../map/context/RouteContext';
import { useMapContext } from '../../../map/context/MapContext';
import { ProcessedRoute } from '../../../map/types/route.types';
import { usePOIContext } from '../../../poi/context/POIContext';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { deserializePhoto } from '../../../photo/utils/photoUtils';
import { ErrorBoundary } from '../../../../components/ErrorBoundary';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MapIcon from '@mui/icons-material/Map';
import { StyledDrawer, NestedDrawer } from './PresentationSidebar.styles';

const formatDate = (date: string | undefined) => {
  if (!date) return 'Unknown date';
  return new Date(date).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

interface PresentationSidebarProps {
  isOpen: boolean;
}

export const PresentationSidebar: React.FC<PresentationSidebarProps> = ({ isOpen }) => {
  const { routes, currentRoute, setCurrentRoute } = useRouteContext();
  const { map } = useMapContext();
  const { loadPOIsFromRoute } = usePOIContext();
  const { addPhoto } = usePhotoContext();
  const [isNestedOpen, setIsNestedOpen] = useState(true);

  const currentIndex = routes.findIndex(route => route.id === currentRoute?.id);

  const updateRouteAndMap = (route: ProcessedRoute) => {
    if (route._type === 'loaded' && route._loadedState) {
      // Update POIs and photos from the loaded state
      if (route._loadedState.pois) {
        loadPOIsFromRoute(route._loadedState.pois);
      }
      if (route._loadedState.photos) {
        addPhoto(route._loadedState.photos.map(deserializePhoto));
      }
    }
    
    setCurrentRoute(route);
    
    // Update map state if available
    if (route._type === 'loaded' && route._loadedState?.mapState && map) {
      const { center, zoom } = route._loadedState.mapState;
      map.setCenter(center);
      map.setZoom(zoom);
    }
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < routes.length) {
      updateRouteAndMap(routes[nextIndex]);
    }
  };

  return (
    <ErrorBoundary>
      <StyledDrawer
        variant="permanent"
        anchor="left"
      >
        <List>
          <Tooltip title="Routes" placement="right">
            <ListItemButton onClick={() => setIsNestedOpen(!isNestedOpen)}>
              <ListItemIcon>
                <MapIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        </List>
      </StyledDrawer>

      <NestedDrawer
        variant="persistent"
        anchor="left"
        open={isNestedOpen}
      >
        <Suspense fallback={<CircularProgress />}>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 3, pb: 0 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2
              }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: 'white' }}>
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
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
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
                  key={route.id}
                  onClick={() => updateRouteAndMap(route)}
                  sx={{
                    backgroundColor: currentRoute?.id === route.id ? 'rgba(74, 158, 255, 0.15)' : 'rgba(35, 35, 35, 0.9)',
                    mb: 1.5,
                    borderRadius: 1,
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    border: currentRoute?.id === route.id ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid transparent',
                    '&:hover': {
                      backgroundColor: currentRoute?.id === route.id ? 'rgba(74, 158, 255, 0.2)' : 'rgba(45, 45, 45, 0.95)',
                      transform: 'scale(1.02)',
                    }
                  }}
                >
                  <ListItemText
                    primary={route.name}
                    secondary={
                      <Box>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.875rem',
                          mt: 0.5
                        }}>
                          {`${(route.statistics.totalDistance / 1000).toFixed(1)}km • ${
                            route._type === 'loaded' ? route._loadedState?.type || 'Unknown' : 'New'
                          }`}
                        </Box>
                        {route._type === 'loaded' && route._loadedState && (
                          <>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem',
                              mt: 0.5
                            }}>
                              <CalendarTodayIcon sx={{ fontSize: 16 }} />
                              {formatDate(route._loadedState.createdAt)}
                            </Box>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem',
                              mt: 0.5
                            }}>
                              <VisibilityIcon sx={{ fontSize: 16 }} />
                              {`${route._loadedState.viewCount || 0} views`}
                            </Box>
                          </>
                        )}
                      </Box>
                    }
                    sx={{ color: 'white' }}
                  />
                </ListItem>
              ))}
            </List>

          </Box>
        </Suspense>
      </NestedDrawer>
    </ErrorBoundary>
  );
};
