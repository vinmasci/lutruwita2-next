import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service';
import { 
  Container, Typography, Box, Button, Grid,
  CircularProgress, Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { RouteCard, RouteCardGrid } from './RouteCard.jsx';
import { useRouteFilters } from './useRouteFilters.jsx';
import LandingPageHeader from './LandingPageHeader';
import HeroCard from './HeroCard';
import EnhancedFilterCard from './EnhancedFilterCard';

// Add spacing at the top to account for the fixed header
const MainContent = styled(Box)(({ theme }) => ({
  paddingTop: '64px', // Height of the header
  minHeight: 'calc(100vh - 64px)',
  width: '100%',
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: theme.palette.background.default
}));

// Background with subtle pattern
const BackgroundPattern = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundImage: 'url(/images/contour.jpeg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  filter: 'invert(1)',
  opacity: 0.08,
  zIndex: 0
});

export const LandingPage = () => {
  const navigate = useNavigate();
  const { loginWithRedirect } = useAuth0();
  const [allRoutes, setAllRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use the custom hook for filter logic
  const {
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
    filteredRoutes,
    displayedRoutes,
    hasMore,
    handleMapTypeToggle,
    loadMoreRoutes
  } = useRouteFilters(allRoutes);
  
  // Fetch routes on component mount
  useEffect(() => {
    const fetchFeaturedRoutes = async () => {
      try {
        setLoading(true);
        setError(null);
        const routes = await publicRouteService.listRoutes();
        setAllRoutes(routes);
      }
      catch (error) {
        setError('Failed to load featured routes');
        console.error('Error fetching featured routes:', error);
      }
      finally {
        setLoading(false);
      }
    };
    fetchFeaturedRoutes();
  }, []);
  
  return _jsxs(_Fragment, {
    children: [
      // Fixed header
      _jsx(LandingPageHeader, { title: "Bikeroutes.com.au" }),
      
      // Main content
      _jsxs(MainContent, {
        children: [
          _jsx(BackgroundPattern, {}),
          
          _jsxs(Container, {
            maxWidth: "lg",
            sx: { position: 'relative', zIndex: 1, py: 4 },
            children: [
              // Route count display
              !loading && !error && _jsx(Box, {
                sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 },
                children: _jsx(Typography, {
                  variant: "subtitle1",
                  color: "text.secondary",
                  children: ["Showing ", displayedRoutes.length, " of ", filteredRoutes.length, " routes"]
                })
              }),
              
              // Loading and error states
              loading ? _jsx(Box, {
                display: "flex",
                justifyContent: "center",
                p: 4,
                children: _jsx(CircularProgress, {})
              }) : error ? _jsx(Alert, {
                severity: "error",
                sx: { maxWidth: 'sm', mx: 'auto' },
                children: error
              }) : _jsxs(_Fragment, {
                children: [
                  // Hero and Filter Cards in first row
                  _jsxs(Grid, {
                    container: true,
                    spacing: 4,
                    sx: { mb: 4 },
                    children: [
                      // Hero Card - takes up 2 card spaces
                      _jsx(Grid, {
                        item: true,
                        xs: 12,
                        sm: 6,
                        children: _jsx(HeroCard, {})
                      }),
                      
                      // Filter Card - takes up 2 card spaces
                      _jsx(Grid, {
                        item: true,
                        xs: 12,
                        sm: 6,
                        children: _jsx(EnhancedFilterCard, {
                          searchTerm: searchTerm,
                          setSearchTerm: setSearchTerm,
                          selectedState: selectedState,
                          setSelectedState: setSelectedState,
                          selectedRegion: selectedRegion,
                          setSelectedRegion: setSelectedRegion,
                          selectedMapTypes: selectedMapTypes,
                          setSelectedMapTypes: setSelectedMapTypes,
                          surfaceType: surfaceType,
                          setSurfaceType: setSurfaceType,
                          distanceFilter: distanceFilter,
                          setDistanceFilter: setDistanceFilter,
                          routeTypeFilter: routeTypeFilter,
                          setRouteTypeFilter: setRouteTypeFilter,
                          availableStates: availableStates,
                          availableRegions: availableRegions,
                          availableMapTypes: availableMapTypes,
                          handleMapTypeToggle: handleMapTypeToggle
                        })
                      })
                    ]
                  }),
                  
                  // Route Cards Grid
                  _jsx(RouteCardGrid, { routes: displayedRoutes }),
                  
                  // Load More Button
                  hasMore && _jsx(Box, {
                    display: "flex",
                    justifyContent: "center",
                    mt: 4,
                    children: _jsx(Button, {
                      variant: "contained",
                      color: "primary",
                      onClick: loadMoreRoutes,
                      sx: {
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        fontFamily: 'Montserrat',
                        minWidth: '200px',
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                        }
                      },
                      children: "Load More Routes"
                    })
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
};
