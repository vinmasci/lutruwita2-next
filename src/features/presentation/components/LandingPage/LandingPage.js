import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service';
import { 
  Container, Typography, Box, Button, Grid,
  CircularProgress, Alert, Skeleton
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

// Background with CSS pattern instead of image
const BackgroundPattern = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  // CSS pattern instead of image
  backgroundImage: `
    linear-gradient(45deg, rgba(0, 0, 0, 0.05) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(0, 0, 0, 0.05) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.05) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.05) 75%)
  `,
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  opacity: 0.15,
  zIndex: 0
});

// Skeleton card for loading state
const SkeletonCard = () => {
  return _jsx(Grid, {
    item: true,
    xs: 12,
    sm: 6,
    md: 3,
    children: _jsx(Box, {
      sx: { height: '100%', borderRadius: 1, overflow: 'hidden' },
      children: [
        _jsx(Skeleton, {
          variant: "rectangular",
          height: 200,
          width: "100%",
          animation: "wave"
        }),
        _jsx(Box, {
          sx: { p: 2 },
          children: [
            _jsx(Skeleton, {
              variant: "text",
              width: "80%",
              height: 24,
              animation: "wave"
            }),
            _jsx(Skeleton, {
              variant: "text",
              width: "60%",
              height: 20,
              animation: "wave"
            }),
            _jsx(Box, {
              sx: { display: 'flex', gap: 1, mt: 1 },
              children: _jsx(Skeleton, {
                variant: "rectangular",
                width: 60,
                height: 20,
                animation: "wave"
              })
            })
          ]
        })
      ]
    })
  });
};

// Skeleton grid for route cards
const SkeletonGrid = () => {
  return _jsx(Grid, {
    container: true,
    spacing: 4,
    children: Array(8).fill().map((_, i) => _jsx(SkeletonCard, {}, i))
  });
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const { loginWithRedirect } = useAuth0();
  const [allRoutes, setAllRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRouteCards, setShowRouteCards] = useState(false);
  
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

  // Fetch routes on component mount with a delay
  useEffect(() => {
    // Fetch routes after a delay to prioritize page rendering
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
    
    // Delay fetching routes to prioritize page rendering
    const fetchTimer = setTimeout(fetchFeaturedRoutes, 200);
    
    // Delay showing route cards to ensure page loads first
    const showCardsTimer = setTimeout(() => {
      setShowRouteCards(true);
    }, 300);
    
    return () => {
      clearTimeout(fetchTimer);
      clearTimeout(showCardsTimer);
    };
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
                  
                  // Route Cards Grid with delayed loading
                  !loading && displayedRoutes.length > 0 && showRouteCards ? 
                    _jsx(RouteCardGrid, { routes: displayedRoutes }) : 
                    _jsx(SkeletonGrid, {}),
                  
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
