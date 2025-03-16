import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service';
import { 
  Container, Typography, Box, Button, Grid,
  CircularProgress, Alert, Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { RouteFilters } from './RouteFilters.jsx';
import { RouteCardGrid } from './RouteCard.jsx';
import { useRouteFilters } from './useRouteFilters.jsx';

export const LandingPage = () => {
    const navigate = useNavigate();
    const { loginWithRedirect } = useAuth0();
    const [allRoutes, setAllRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const featuredRoutesRef = React.useRef(null);
    
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
    
    const scrollToFeaturedRoutes = () => {
        featuredRoutesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
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
    
    const goToEditor = () => {
        navigate('/editor');
    };
    
    return (_jsxs(Box, { sx: {
            minHeight: '100vh',
            width: '100vw',
            overflow: 'hidden',
            position: 'relative'
        }, children: [_jsxs(Box, { sx: {
                    position: 'relative',
                    height: '70vh', // Reduced from 100vh to 50vh to make the hero section smaller
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'url(/images/hero.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundAttachment: 'scroll', // Removed parallax effect to improve performance
                        filter: 'brightness(0.55)',
                        zIndex: 0
                    }
                }, children: [_jsx(Container, { maxWidth: "lg", sx: { position: 'relative', zIndex: 1 }, children: _jsxs(Box, { textAlign: "center", children: [_jsx(Typography, { variant: "h2", component: "h1", gutterBottom: true, sx: {
                                        fontFamily: 'Montserrat',
                                        fontWeight: 'bold',
                                        mb: 3,
                                        fontSize: { xs: '2.5rem', md: '3.75rem' },
                                        color: 'white',
                                        textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)',
                                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                        borderRadius: '16px',
                                        padding: '16px',
                                        display: 'inline-block'
                                    }, children: "Create Beautiful Maps" }), _jsx(Typography, { variant: "h5", sx: {
                                        fontFamily: 'Montserrat',
                                        maxWidth: 'md',
                                        mx: 'auto',
                                        mb: 4,
                                        color: 'white',
                                        textShadow: '1px 1px 4px rgba(0, 0, 0, 0.8)',
                                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                        borderRadius: '12px',
                                        padding: '12px'
                                    }, children: "Create & share beautiful cycling, hiking or tourism maps with 3d terrain, points of interest, photos and much more.." }), _jsxs(Stack, { spacing: 3, alignItems: "center", children: [_jsx(Button, { variant: "outlined", size: "large", sx: {
                                                px: 6,
                                                py: 2.5,
                                                fontSize: '1.2rem',
                                                fontFamily: 'Montserrat',
                                                minWidth: '320px',
                                                height: '64px',
                                                color: 'white',
                                                borderColor: 'white',
                                                borderWidth: 2,
                                                bgcolor: 'rgba(0, 0, 0, 0.3)',
                                                '&:hover': {
                                                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                                                    borderColor: 'white',
                                                    borderWidth: 2
                                                }
                                            }, onClick: goToEditor, children: "Create A Map" }), _jsxs(Button, { variant: "outlined", size: "large", onClick: scrollToFeaturedRoutes, sx: {
                                                px: 6,
                                                py: 2.5,
                                                fontSize: '1.2rem',
                                                fontFamily: 'Montserrat',
                                                minWidth: '320px',
                                                height: '100px',
                                                color: 'white',
                                                borderColor: 'white',
                                                borderWidth: 2,
                                                bgcolor: 'rgba(0, 0, 0, 0.3)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 1,
                                                '&:hover': {
                                                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                                                    borderColor: 'white',
                                                    borderWidth: 2
                                                }
                                            }, children: ["Featured Routes", _jsx("i", { className: "fa-sharp fa-solid fa-circle-chevron-down", style: { fontSize: '2rem', color: 'white' } })] })] })] }) })] }), _jsx(Box, { ref: featuredRoutesRef, sx: {
                    py: 8,
                    bgcolor: 'background.default',
                    position: 'relative',
                    '&::before': {
                        content: '""',
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
                    }
                }, children: _jsxs(Container, { maxWidth: "lg", sx: { position: 'relative', zIndex: 1 }, children: [_jsx(Typography, { variant: "h2", component: "h2", textAlign: "center", gutterBottom: true, sx: {
                                fontFamily: 'Montserrat',
                                mb: 3,
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: { xs: '2.5rem', md: '3.75rem' },
                                textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)'
                            }, children: "Find a route..." }), 
                            
                            // Use the RouteFilters component
                            _jsx(RouteFilters, {
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
                            }),
                            
                            loading ? (_jsx(Box, { display: "flex", justifyContent: "center", p: 4, children: _jsx(CircularProgress, {}) })) : error ? (_jsx(Alert, { severity: "error", sx: { maxWidth: 'sm', mx: 'auto' }, children: error })) : (_jsxs(_Fragment, { children: [
                                _jsx(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children:
                                    _jsxs(Typography, { variant: "subtitle1", color: "text.secondary", children: [
                                        "Showing ", displayedRoutes.length, " of ", filteredRoutes.length, " routes"
                                    ]})
                                }),
                                
                                // Use the RouteCardGrid component
                                _jsx(RouteCardGrid, { routes: displayedRoutes }),
                                
                                hasMore && !loading && !error && (_jsx(Box, { display: "flex", justifyContent: "center", mt: 4, children: _jsx(Button, { variant: "contained", color: "primary", onClick: loadMoreRoutes, sx: {
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
                                }, children: "Load More Routes" }) }))] }))] }) })] }));
};
