import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, Suspense } from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Typography, IconButton, CircularProgress, Tooltip, Divider } from '@mui/material';
import { useRouteContext } from '../../../map/context/RouteContext';
import { useMapContext } from '../../../map/context/MapContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { deserializePhoto } from '../../../photo/utils/photoUtils';
import { ErrorBoundary } from '../../../../components/ErrorBoundary';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import { ListOrdered, Camera, CameraOff } from 'lucide-react';
import { StyledDrawer, NestedDrawer } from './PresentationSidebar.styles';

export const PresentationSidebar = ({ isOpen }) => {
    const { routes, currentRoute, setCurrentRoute } = useRouteContext();
    const { map } = useMapContext();
    const { loadPOIsFromRoute } = usePOIContext();
    const { addPhoto, isPhotosVisible, togglePhotosVisibility } = usePhotoContext();
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

    return (_jsxs(ErrorBoundary, { children: [
        _jsx(StyledDrawer, { 
            variant: "permanent", 
            anchor: "left", 
            children: _jsxs(List, { 
                children: [
                    _jsx(Tooltip, { 
                        title: "Routes", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: () => {
                                setIsNestedOpen(!isNestedOpen);
                            },
                            'data-active': isNestedOpen,
                            sx: {
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                },
                                '&:hover .MuiListItemIcon-root svg, &[data-active="true"] .MuiListItemIcon-root svg': {
                                    color: '#ff4d4f'
                                }
                            }, 
                            children: _jsx(ListItemIcon, { 
                                children: _jsx(ListOrdered, {}) 
                            }) 
                        }) 
                    }),
                    _jsx(Divider, { 
                        sx: { 
                            my: 1, 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)' 
                        } 
                    }),
                    _jsx(Tooltip, { 
                        title: isPhotosVisible ? "Hide Photos" : "Show Photos", 
                        placement: "right", 
                        children: _jsx(ListItemButton, { 
                            onClick: togglePhotosVisibility,
                            sx: {
                                marginTop: '8px',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                },
                                '&:hover .MuiListItemIcon-root svg': {
                                    color: '#ff4d4f'
                                }
                            }, 
                            children: _jsx(ListItemIcon, { 
                                children: isPhotosVisible ? 
                                    _jsx(Camera, { color: '#4caf50' }) : 
                                    _jsx(CameraOff, { color: '#ff4d4f' }) 
                            }) 
                        }) 
                    })
                ] 
            }) 
        }), 
        _jsx(NestedDrawer, { 
            variant: "persistent", 
            anchor: "left", 
            open: isNestedOpen, 
            children: _jsx(Suspense, { 
                fallback: _jsx(CircularProgress, {}), 
                children: _jsxs(Box, { 
                    sx: { display: 'flex', flexDirection: 'column', height: '100%' }, 
                    children: [
                        _jsx(Box, { 
                            sx: { p: 3, pb: 0 }, 
                            children: _jsxs(Box, { 
                                sx: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 2
                                }, 
                                children: [
                                    _jsx(Typography, { 
                                        variant: "h5", 
                                        component: "h2", 
                                        sx: { fontWeight: 600, color: 'white' }, 
                                        children: "Routes" 
                                    }), 
                                    _jsxs(Box, { 
                                        sx: { display: 'flex', alignItems: 'center', gap: 1 }, 
                                        children: [
                                            _jsx(Tooltip, { 
                                                title: "Previous route", 
                                                children: _jsx("span", { 
                                                    children: _jsx(IconButton, { 
                                                        onClick: () => handleNavigate('prev'), 
                                                        disabled: currentIndex <= 0, 
                                                        sx: {
                                                            color: 'white',
                                                            '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' }
                                                        }, 
                                                        children: _jsx(NavigateBeforeIcon, {}) 
                                                    }) 
                                                }) 
                                            }), 
                                            _jsx(Typography, { 
                                                variant: "body2", 
                                                sx: { color: 'rgba(255, 255, 255, 0.7)' }, 
                                                children: `${currentIndex + 1} of ${routes.length}` 
                                            }), 
                                            _jsx(Tooltip, { 
                                                title: "Next route", 
                                                children: _jsx("span", { 
                                                    children: _jsx(IconButton, { 
                                                        onClick: () => handleNavigate('next'), 
                                                        disabled: currentIndex >= routes.length - 1, 
                                                        sx: {
                                                            color: 'white',
                                                            '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' }
                                                        }, 
                                                        children: _jsx(NavigateNextIcon, {}) 
                                                    }) 
                                                }) 
                                            })
                                        ] 
                                    })
                                ] 
                            }) 
                        }), 
                        _jsx(List, { 
                            sx: { flex: 1, overflowY: 'auto', px: 3, py: 2, pb: 40 }, 
                            children: routes.map((route) => (
                                _jsx(ListItem, { 
                                    onClick: () => updateRouteAndMap(route), 
                                    sx: {
                                        backgroundColor: currentRoute?.id === route.id ? 'rgba(74, 158, 255, 0.15)' : 'rgba(35, 35, 35, 0.9)',
                                        mb: 1.5,
                                        borderRadius: 1,
                                        transition: 'all 0.2s ease-in-out',
                                        cursor: 'pointer',
                                        border: currentRoute?.id === route.id ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid transparent',
                                        '&:hover': {
                                            backgroundColor: currentRoute?.id === route.id ? 'rgba(74, 158, 255, 0.2)' : 'rgba(45, 45, 45, 0.95)',
                                            transform: 'scale(1.02)',
                                            '& i': {
                                                color: '#4a9eff !important'
                                            }
                                        },
                                        '& i': {
                                            transition: 'color 0.2s ease-in-out',
                                            color: currentRoute?.id === route.id ? '#4a9eff !important' : '#0288d1'
                                        }
                                    }, 
                                    children: _jsx(ListItemText, { 
                                        primary: route.name, 
                                        sx: { 
                                            color: 'white',
                                            '& .MuiTypography-root': {
                                                wordWrap: 'break-word',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word',
                                                whiteSpace: 'normal'
                                            }
                                        },
                                        secondary: _jsxs("div", {
                                            style: { 
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1px',
                                                fontSize: '0.75rem',
                                                marginTop: '5px'
                                            },
                                            children: [
                                                _jsxs("div", {
                                                    style: { display: 'flex', alignItems: 'center', gap: '8px' },
                                                    children: [
                                                        _jsx("i", { 
                                                            className: "fa-solid fa-route",
                                                            style: { color: '#4a9eff', fontSize: '0.8125rem' }
                                                        }),
                                                        _jsx("span", {
                                                            style: { color: 'white' },
                                                            children: `${(route.statistics.totalDistance / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}km`
                                                        })
                                                    ]
                                                }),
                                                _jsxs("div", {
                                                    style: { display: 'flex', alignItems: 'center', gap: '5px' },
                                                    children: [
                                                        _jsx("i", { 
                                                            className: "fa-solid fa-person-biking-mountain",
                                                            style: { color: '#4a9eff', fontSize: '0.8125rem' }
                                                        }),
                                                        _jsx("span", {
                                                            style: { color: 'white' },
                                                            children: `${(() => {
                                                                if (!route.unpavedSections || !route.statistics.totalDistance) return '0';
                                                                const pointCount = route.geojson.features[0].properties.coordinateProperties.elevation.length;
                                                                let unpavedDistance = 0;
                                                                for (const section of route.unpavedSections) {
                                                                    const sectionStartDist = (section.startIndex / (pointCount - 1)) * route.statistics.totalDistance;
                                                                    const sectionEndDist = (section.endIndex / (pointCount - 1)) * route.statistics.totalDistance;
                                                                    unpavedDistance += sectionEndDist - sectionStartDist;
                                                                }
                                                                return ((unpavedDistance / route.statistics.totalDistance) * 100).toFixed(0);
                                                            })()}% unpaved`
                                                        })
                                                    ]
                                                }),
                                                _jsxs("div", {
                                                    style: { display: 'flex', alignItems: 'center', gap: '11px' },
                                                    children: [
                                                        _jsx("i", { 
                                                            className: "fa-solid fa-up-right",
                                                            style: { color: '#4a9eff', fontSize: '0.8125rem' }
                                                        }),
                                                        _jsx("span", {
                                                            style: { color: 'white' },
                                                            children: `${Math.round(route.statistics.elevationGain).toLocaleString() || 0}m`
                                                        }),
                                                        _jsx("i", { 
                                                            className: "fa-solid fa-down-right",
                                                            style: { color: '#4a9eff', fontSize: '0.8125rem', marginLeft: '8px' }
                                                        }),
                                                        _jsx("span", {
                                                            style: { color: 'white' },
                                                            children: `${Math.round(route.statistics.elevationLoss).toLocaleString() || 0}m`
                                                        })
                                                    ]
                                                })
                                            ]
                                        })
                                    }) 
                                }, route.id)
                            )) 
                        })
                    ] 
                }) 
            }) 
        })
    ] }));
};
