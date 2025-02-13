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
  const [isNestedOpen, setIsNestedOpen] = useState(true);

  const currentIndex = routes.findIndex(route => route.id === currentRoute?.id);

  const handleRouteClick = (route: ProcessedRoute) => {
    setCurrentRoute(route);
    
    // If we have map state with center and zoom, use that
    if (route._type === 'loaded' && route._loadedState?.mapState) {
      const { center, zoom } = route._loadedState.mapState;
      map?.setCenter(center);
      map?.setZoom(zoom);
    }
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentIndex < routes.length - 1) {
      handleRouteClick(routes[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      handleRouteClick(routes[currentIndex - 1]);
    }
  };

  return (
    <ErrorBoundary>
      <StyledDrawer
        variant="permanent"
        anchor="left"
      >
        <List>
          <ListItemButton onClick={() => setIsNestedOpen(!isNestedOpen)}>
            <ListItemIcon>
              <MapIcon />
            </ListItemIcon>
          </ListItemButton>
        </List>
      </StyledDrawer>

      <NestedDrawer
        variant="persistent"
        anchor="left"
        open={isNestedOpen}
      >
        <Suspense fallback={<CircularProgress />}>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1, color: 'white' }}>
                Routes
              </Typography>
              {currentRoute && (
                <>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Currently viewing
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#4a9eff' }}>
                    {currentRoute.name}
                  </Typography>
                </>
              )}
            </Box>

            <List sx={{ flex: 1, overflowY: 'auto' }}>
              {routes.map((route) => (
                <ListItem
                  key={route.id}
                  onClick={() => handleRouteClick(route)}
                  sx={{
                    backgroundColor: currentRoute?.id === route.id ? 'rgba(55, 55, 55, 0.95)' : 'rgba(35, 35, 35, 0.9)',
                    mb: 1,
                    borderRadius: 1,
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    borderLeft: currentRoute?.id === route.id ? '3px solid #4a9eff' : '1px solid transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(45, 45, 45, 0.95)',
                      transform: 'translateX(4px)',
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

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              p: 2,
              borderTop: '1px solid #333'
            }}>
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
        </Suspense>
      </NestedDrawer>
    </ErrorBoundary>
  );
};
