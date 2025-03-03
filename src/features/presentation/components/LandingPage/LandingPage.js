import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service';
import { MapPreview } from '../MapPreview/MapPreview';
import { Container, Typography, Box, Button, Grid, Card, CardContent, CircularProgress, Alert, Stack } from '@mui/material';
import TerrainIcon from '@mui/icons-material/Terrain';
import StraightenIcon from '@mui/icons-material/Straighten';
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
                            }, children: "Featured Routes" }), loading ? (_jsx(Box, { display: "flex", justifyContent: "center", p: 4, children: _jsx(CircularProgress, {}) })) : error ? (_jsx(Alert, { severity: "error", sx: { maxWidth: 'sm', mx: 'auto' }, children: error })) : (_jsxs(_Fragment, { children: [_jsx(Grid, { container: true, spacing: 4, children: displayedRoutes.map((route) => (_jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: _jsxs(StyledCard, { onClick: () => navigate(`/preview/route/${route.persistentId}`), sx: { cursor: 'pointer' }, children: [_jsx(MapPreviewWrapper, { children: _jsx(MapPreview, { center: route.mapState.center, zoom: route.mapState.zoom, routes: route.routes }) }), _jsxs(CardContent, { children: [_jsx(Typography, { variant: "h6", gutterBottom: true, sx: { fontFamily: 'Montserrat' }, children: route.name }), _jsxs(Stack, { spacing: 1, sx: { mt: 1 }, children: [_jsx(LocationDisplay, { geojson: route.routes[0].geojson }), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsx(StraightenIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: [calculateTotalDistance(route.routes), "km"] })] }), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsx(TerrainIcon, { sx: { fontSize: 16, color: 'text.secondary' } }), _jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: [calculateTotalElevation(route.routes), "m"] })] })] }), _jsxs(Stack, { spacing: 1, sx: { mt: 2 }, children: [_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", divider: _jsx(Typography, { color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: "\u2022" }), children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: [route.viewCount, " views"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: new Date(route.createdAt).toLocaleDateString() })] }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { fontFamily: 'Montserrat' }, children: route.type.charAt(0).toUpperCase() + route.type.slice(1) })] })] })] }) }, route.id))) }), hasMore && !loading && !error && (_jsx(Box, { display: "flex", justifyContent: "center", mt: 4, children: _jsx(Button, { variant: "contained", color: "primary", onClick: loadMoreRoutes, sx: {
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
