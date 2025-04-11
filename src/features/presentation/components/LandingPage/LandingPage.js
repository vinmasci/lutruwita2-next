import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service';
import { withPerformanceTracking, logPerformanceSummary } from '../../../../utils/performanceUtils';
import { 
  Container, Typography, Box, Button, Grid,
  CircularProgress, Alert, Skeleton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useRouteFilters } from './useRouteFilters.jsx';
import LazyRouteCardGrid from './LazyRouteCardGrid';
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

// Wrap the component with performance tracking
export const LandingPage = () => {
  // Log performance summary when component unmounts
  useEffect(() => {
    return () => {
      // Log performance summary when component unmounts
      setTimeout(() => {
        logPerformanceSummary();
      }, 500); // Delay to ensure all async operations complete
    };
  }, []);
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

  // Initialize with loading state and fetch routes
  useEffect(() => {
    console.time('LandingPage-TotalLoadTime');
    
    // Start in loading state
    setLoading(true);
    
    // Fetch routes in the background
    const fetchFeaturedRoutes = async () => {
      try {
        console.time('FetchRoutesOperation');
        
        // Wrap the API call with performance tracking
        const routes = await withPerformanceTracking(
          publicRouteService.listRoutes,
          'publicRouteService.listRoutes'
        )();
        
        console.timeEnd('FetchRoutesOperation');
        setAllRoutes(routes);
        
        // Set loading to false and show route cards
        setLoading(false);
        setShowRouteCards(true);
        
        console.timeEnd('LandingPage-TotalLoadTime');
      }
      catch (error) {
        setError('Failed to load featured routes');
        console.error('Error fetching featured routes:', error);
        setLoading(false);
      }
    };
    
    // Start fetching routes
    fetchFeaturedRoutes();
    
    return () => {
      // Cleanup
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
              error ? _jsx(Alert, {
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
                  
                  // Route Cards Grid with lazy loading
                  loading ? (
                    _jsx(Box, {
                      sx: { display: "flex", justifyContent: "center", alignItems: "center", p: 4 },
                      children: _jsx(CircularProgress, { size: 60 })
                    })
                  ) : showRouteCards ? (
                    _jsx(LazyRouteCardGrid, { routes: displayedRoutes })
                  ) : (
                    _jsx(SkeletonGrid, {})
                  ),
                  
                  // Load More Button
                  hasMore && _jsx(Box, {
                    sx: { display: "flex", justifyContent: "center", mt: 4 },
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
