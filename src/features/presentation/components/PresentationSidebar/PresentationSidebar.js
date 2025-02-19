import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, Suspense } from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Typography, IconButton, CircularProgress, Tooltip } from '@mui/material';
import { useRouteContext } from '../../../map/context/RouteContext';
import { useMapContext } from '../../../map/context/MapContext';
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
const formatDate = (date) => {
    if (!date)
        return 'Unknown date';
    return new Date(date).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};
export const PresentationSidebar = ({ isOpen }) => {
    const { routes, currentRoute, setCurrentRoute } = useRouteContext();
    const { map } = useMapContext();
    const { loadPOIsFromRoute } = usePOIContext();
    const { addPhoto } = usePhotoContext();
    const [isNestedOpen, setIsNestedOpen] = useState(true);
    const currentIndex = routes.findIndex(route => route.id === currentRoute?.id);
    const updateRouteAndMap = (route) => {
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
    const handleNavigate = (direction) => {
        const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < routes.length) {
            updateRouteAndMap(routes[nextIndex]);
        }
    };
    return (_jsxs(ErrorBoundary, { children: [_jsx(StyledDrawer, { variant: "permanent", anchor: "left", children: _jsx(List, { children: _jsx(Tooltip, { title: "Routes", placement: "right", children: _jsx(ListItemButton, { onClick: () => setIsNestedOpen(!isNestedOpen), children: _jsx(ListItemIcon, { children: _jsx(MapIcon, {}) }) }) }) }) }), _jsx(NestedDrawer, { variant: "persistent", anchor: "left", open: isNestedOpen, children: _jsx(Suspense, { fallback: _jsx(CircularProgress, {}), children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx(Box, { sx: { p: 3, pb: 0 }, children: _jsxs(Box, { sx: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mb: 2
                                    }, children: [_jsx(Typography, { variant: "h5", component: "h2", sx: { fontWeight: 600, color: 'white' }, children: "Routes" }), _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(Tooltip, { title: "Previous route", children: _jsx("span", { children: _jsx(IconButton, { onClick: () => handleNavigate('prev'), disabled: currentIndex <= 0, sx: {
                                                                color: 'white',
                                                                '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' }
                                                            }, children: _jsx(NavigateBeforeIcon, {}) }) }) }), _jsx(Typography, { variant: "body2", sx: { color: 'rgba(255, 255, 255, 0.7)' }, children: `${currentIndex + 1} of ${routes.length}` }), _jsx(Tooltip, { title: "Next route", children: _jsx("span", { children: _jsx(IconButton, { onClick: () => handleNavigate('next'), disabled: currentIndex >= routes.length - 1, sx: {
                                                                color: 'white',
                                                                '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' }
                                                            }, children: _jsx(NavigateNextIcon, {}) }) }) })] })] }) }), _jsx(List, { sx: { flex: 1, overflowY: 'auto', px: 3, py: 2, pb: 40 }, children: routes.map((route) => (_jsx(ListItem, { onClick: () => updateRouteAndMap(route), sx: {
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
                                    }, children: _jsx(ListItemText, { primary: route.name, secondary: _jsxs(Box, { children: [_jsx(Box, { sx: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                        color: 'rgba(255, 255, 255, 0.7)',
                                                        fontSize: '0.875rem',
                                                        mt: 0.5
                                                    }, children: `${(route.statistics.totalDistance / 1000).toFixed(1)}km • ${route._type === 'loaded' ? route._loadedState?.type || 'Unknown' : 'New'}` }), route._type === 'loaded' && route._loadedState && (_jsxs(_Fragment, { children: [_jsxs(Box, { sx: {
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                                color: 'rgba(255, 255, 255, 0.7)',
                                                                fontSize: '0.875rem',
                                                                mt: 0.5
                                                            }, children: [_jsx(CalendarTodayIcon, { sx: { fontSize: 16 } }), formatDate(route._loadedState.createdAt)] }), _jsxs(Box, { sx: {
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                                color: 'rgba(255, 255, 255, 0.7)',
                                                                fontSize: '0.875rem',
                                                                mt: 0.5
                                                            }, children: [_jsx(VisibilityIcon, { sx: { fontSize: 16 } }), `${route._loadedState.viewCount || 0} views`] })] }))] }), sx: { color: 'white' } }) }, route.id))) })] }) }) })] }));
};
