import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service';
import { MapPreview } from '../MapPreview/MapPreview';
import { Container, Typography, Box, Button, Grid, Card, CardContent, CircularProgress, Alert, Stack, Chip, Avatar, Divider } from '@mui/material';
import TerrainIcon from '@mui/icons-material/Terrain';
import StraightenIcon from '@mui/icons-material/Straighten';
import PersonIcon from '@mui/icons-material/Person';
// Using TerrainIcon again instead of RoadIcon which is not available
import { styled } from '@mui/material/styles';
import { getStartingLocation } from '../../utils/locationUtils';

const LocationDisplay = ({ geojson }) => {
    const [location, setLocation] = useState({ state: 'AUSTRALIA', city: 'UNKNOWN' });
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const fetchLocation = async () => {
            try {
                setIsLoading(true);
                const result = await getStartingLocation(geojson);
                setLocation({ state: `AUSTRALIA, ${result.state}`, city: result.city });
            }
            catch (error) {
                console.error('Error fetching location:', error);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchLocation();
    }, [geojson]);
    if (isLoading) {
        return (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: "AUSTRALIA" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: "Loading location..." })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: location.state }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: location.city })] }));
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

const calculateTotalDistance = (routes) => {
    return Math.round(routes
        .filter(r => r.statistics?.totalDistance)
        .reduce((total, r) => total + r.statistics.totalDistance, 0) / 1000)
        .toLocaleString();
};

const calculateTotalElevation = (routes) => {
    return Math.round(routes
        .filter(r => r.statistics?.elevationGain)
        .reduce((total, r) => total + r.statistics.elevationGain, 0))
        .toLocaleString();
};

// Calculate percentage of unpaved surface
const calculateUnpavedPercentage = (routes) => {
    // This is a placeholder calculation - adjust based on your actual data structure
    // Assuming routes have a 'surfaceTypes' property with percentages or distances
    try {
        const totalDistance = routes
            .filter(r => r.statistics?.totalDistance)
            .reduce((total, r) => total + r.statistics.totalDistance, 0);
        
        if (!totalDistance) return 0;
        
        // Placeholder: randomly generate a percentage between 0-100 for demo
        // Replace this with actual calculation based on your data
        const unpavedDistance = Math.floor(Math.random() * totalDistance);
        return Math.round((unpavedDistance / totalDistance) * 100);
    } catch (error) {
        console.error('Error calculating unpaved percentage:', error);
        return 0;
    }
};

export const LandingPage = () => {
    const navigate = useNavigate();
    const { loginWithRedirect } = useAuth0();
    const [allRoutes, setAllRoutes] = useState([]);
    const [displayedRoutes, setDisplayedRoutes] = useState([]);
    const [visibleCount, setVisibleCount] = useState(3);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const featuredRoutesRef = React.useRef(null);
    
    const scrollToFeaturedRoutes = () => {
        featuredRoutesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    const loadMoreRoutes = () => {
        const nextVisibleCount = visibleCount + 3;
        setVisibleCount(nextVisibleCount);
        setDisplayedRoutes(allRoutes.slice(0, nextVisibleCount));
        setHasMore(nextVisibleCount < allRoutes.length);
    };
    
    useEffect(() => {
        const fetchFeaturedRoutes = async () => {
            try {
                setLoading(true);
                setError(null);
                const routes = await publicRouteService.listRoutes();
                setAllRoutes(routes);
                setDisplayedRoutes(routes.slice(0, visibleCount));
                setHasMore(routes.length > visibleCount);
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
                    height: '100vh',
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
                        backgroundAttachment: { xs: 'scroll', sm: 'fixed' }, // Parallax only on non-mobile
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
                                mb: 6,
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: { xs: '2.5rem', md: '3.75rem' },
                                textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)'
                            }, children: "Featured Routes" }), loading ? (_jsx(Box, { display: "flex", justifyContent: "center", p: 4, children: _jsx(CircularProgress, {}) })) : error ? (_jsx(Alert, { severity: "error", sx: { maxWidth: 'sm', mx: 'auto' }, children: error })) : (_jsxs(_Fragment, { children: [_jsx(Grid, { container: true, spacing: 4, children: displayedRoutes.map((route) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsxs(StyledCard, { onClick: () => navigate(`/preview/route/${route.persistentId}`), sx: { cursor: 'pointer' }, children: [_jsx(MapPreviewWrapper, { children: _jsx(MapPreview, { center: route.mapState.center, zoom: route.mapState.zoom, routes: route.routes }) }), _jsxs(CardContent, { children: [
                                                // Route name and user info in mercato format
                                                _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [
                                                    _jsx(Typography, { variant: "h6", sx: { fontFamily: 'Montserrat', fontWeight: 'bold' }, children: route.name }),
                                                    _jsxs(Box, { sx: { display: 'flex', alignItems: 'center' }, children: [
                                                        _jsx(Avatar, { sx: { width: 24, height: 24, mr: 1, bgcolor: 'primary.main' }, children: _jsx(PersonIcon, { fontSize: "small" }) }),
                                                        _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: route.createdBy?.name || "Anonymous" })
                                                    ] })
                                                ] }),
                                                
                                                // Location info
                                                _jsx(LocationDisplay, { geojson: route.routes[0].geojson }),
                                                
                                                _jsx(Divider, { sx: { my: 1.5 } }),
                                                
                                                // Route stats in mercato format
                                                _jsxs(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }, children: [
                                                    // Distance chip
                                                    _jsxs(Chip, { 
                                                        icon: _jsx(StraightenIcon, { sx: { fontSize: 16 } }), 
                                                        label: _jsxs(Typography, { variant: "body2", sx: { fontFamily: 'Montserrat' }, children: [
                                                            calculateTotalDistance(route.routes), "km"
                                                        ] }),
                                                        size: "small",
                                                        sx: { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                                                    }),
                                                    
                                                    // Elevation chip
                                                    _jsxs(Chip, { 
                                                        icon: _jsx(TerrainIcon, { sx: { fontSize: 16 } }), 
                                                        label: _jsxs(Typography, { variant: "body2", sx: { fontFamily: 'Montserrat' }, children: [
                                                            calculateTotalElevation(route.routes), "m"
                                                        ] }),
                                                        size: "small",
                                                        sx: { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                                                    }),
                                                    
                                                    // Unpaved percentage chip - using StraightenIcon instead of RoadIcon
                                                    _jsxs(Chip, { 
                                                        icon: _jsx(StraightenIcon, { sx: { fontSize: 16 } }), 
                                                        label: _jsxs(Typography, { variant: "body2", sx: { fontFamily: 'Montserrat' }, children: [
                                                            calculateUnpavedPercentage(route.routes), "% unpaved"
                                                        ] }),
                                                        size: "small",
                                                        sx: { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                                                    })
                                                ] }),
                                                
                                                _jsx(Divider, { sx: { my: 1.5 } }),
                                                
                                                // Footer info
                                                _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mt: 1 }, children: [
                                                    // Route type
                                                    _jsx(Chip, {
                                                        label: route.type.charAt(0).toUpperCase() + route.type.slice(1),
                                                        size: "small",
                                                        sx: { 
                                                            bgcolor: 'primary.main', 
                                                            color: 'white',
                                                            fontFamily: 'Montserrat',
                                                            fontWeight: 'bold'
                                                        }
                                                    }),
                                                    
                                                    // Views and date
                                                    _jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: [
                                                        route.viewCount, " views • ", 
                                                        new Date(route.createdAt).toLocaleDateString()
                                                    ] })
                                                ] })
                                            ] })] }) }, route.id))) }), hasMore && !loading && !error && (_jsx(Box, { display: "flex", justifyContent: "center", mt: 4, children: _jsx(Button, { variant: "contained", color: "primary", onClick: loadMoreRoutes, sx: {
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
