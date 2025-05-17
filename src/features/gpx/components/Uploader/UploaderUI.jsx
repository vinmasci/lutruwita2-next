import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Alert, Box, Button, CircularProgress, Typography, IconButton, TextField, List, Paper, Divider, Popover, LinearProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useRouteContext } from '../../../map/context/RouteContext';
import { getRouteDistance, getUnpavedPercentage, getElevationGain, getElevationLoss } from '../../utils/routeUtils';
import { getRouteLocationData } from '../../../../utils/geocoding';
import { useAutoSave } from '../../../../context/AutoSaveContext';
import { useAuth0 } from '@auth0/auth0-react';
import { updateRouteInFirebase } from '../../../../services/firebaseGpxAutoSaveService';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useDropzone } from 'react-dropzone';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableRouteItem } from './DraggableRouteItem';
import { PRESET_COLORS, validateHexColor } from './constants';

const ColorButton = ({ color, onClick, sx }) => (
    <Box
        onClick={onClick}
        sx={{
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            cursor: 'pointer',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.2s ease-in-out',
            backgroundColor: color,
            '&:hover': {
                transform: 'scale(1.1)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
            },
            ...sx
        }}
    />
);

const UploaderUI = ({ isLoading, error, debugLog, onFileAdd, onFileDelete, onFileRename }) => {
    const [editing, setEditing] = useState(null);
    const { routes, currentRoute, setCurrentRoute, reorderRoutes, updateRoute } = useRouteContext();
    const [localRoutes, setLocalRoutes] = useState(routes);
    const [colorPickerAnchor, setColorPickerAnchor] = useState(null);
    const [selectedRouteId, setSelectedRouteId] = useState(null);
    const [customColor, setCustomColor] = useState('');
    const [customColorError, setCustomColorError] = useState('');
    const [routeType, setRouteType] = useState('Single');
    const { overallRouteName, updateOverallRouteName, currentLoadedPersistentId } = useRouteContext(); // Get overallRouteName and its updater
    const [localOverallName, setLocalOverallName] = useState(overallRouteName || '');
    
    // Get the AutoSave context and Auth0 context for Firebase auto-save
    const autoSave = useAutoSave();
    const { user, isAuthenticated } = useAuth0();
    
    // Get the current loaded state from RouteContext
    const { currentLoadedState } = useRouteContext();
    
    // Effect to update route type when currentRoute changes
    useEffect(() => {
        if (currentRoute?._loadedState?.routeType) {
            console.log('[UploaderUI] Setting route type from currentRoute._loadedState:', currentRoute._loadedState.routeType);
            setRouteType(currentRoute._loadedState.routeType);
        }
    }, [currentRoute]);
    
    // Additional effect to update route type when currentLoadedState changes
    useEffect(() => {
        if (currentLoadedState?.routeType) {
            console.log('[UploaderUI] Setting route type from currentLoadedState:', currentLoadedState.routeType);
            setRouteType(currentLoadedState.routeType);
        }
    }, [currentLoadedState]);

    // Effect to update local routes when routes change
    useEffect(() => {
        setLocalRoutes(routes);
    }, [routes]);

    // Effect to update localOverallName when overallRouteName from context changes (e.g., on load)
    useEffect(() => {
        setLocalOverallName(overallRouteName || '');
    }, [overallRouteName]);

    // Generate master route by combining all routes
    const masterRoute = useMemo(() => {
        if (routeType !== 'Bikepacking' || !localRoutes || localRoutes.length === 0) return null;
        
        // Create a combined route object with a unique ID
        const combinedRoute = {
            routeId: "master-route",
            id: "master-route",
            name: "Full Route",
            color: "#4a9eff", // Blue color for master route
            priority: 100, // High priority to ensure it renders on top
            // Initialize with empty values that will be calculated
            statistics: {
                totalDistance: 0,
                elevationGain: 0,
                elevationLoss: 0
            },
            unpavedSections: [],
            // Add description field for the master route
            description: "Combined route of all segments"
        };
        
        // Combine statistics from all routes
        let totalDistance = 0;
        let totalElevationGain = 0;
        let totalElevationLoss = 0;
        
        // Calculate combined statistics
        localRoutes.forEach(route => {
            totalDistance += getRouteDistance(route);
            totalElevationGain += getElevationGain(route);
            totalElevationLoss += getElevationLoss(route);
        });
        
        // Update the combined route with calculated statistics
        combinedRoute.statistics.totalDistance = totalDistance;
        combinedRoute.statistics.elevationGain = totalElevationGain;
        combinedRoute.statistics.elevationLoss = totalElevationLoss;
        
        // Create a combined GeoJSON structure with proper elevation data
        const allCoordinates = [];
        const allElevations = [];
        const allUnpavedSections = [];
        let currentCoordinateIndex = 0;
        
        // Process each route to combine coordinates, elevations, and unpaved sections
        localRoutes.forEach(route => {
            if (!route.geojson?.features?.[0]?.geometry?.coordinates) return;
            
            const coordinates = route.geojson.features[0].geometry.coordinates;
            const elevations = route.geojson.features[0].properties?.coordinateProperties?.elevation || [];
            
            // Add coordinates and elevations
            coordinates.forEach((coord, idx) => {
                allCoordinates.push(coord);
                // Use elevation if available, otherwise use 0
                allElevations.push(elevations[idx] || 0);
            });
            
            // Process unpaved sections
            if (route.unpavedSections && route.unpavedSections.length > 0) {
                route.unpavedSections.forEach(section => {
                    allUnpavedSections.push({
                        ...section,
                        // Adjust indices for the combined route
                        startIndex: section.startIndex + currentCoordinateIndex,
                        endIndex: section.endIndex + currentCoordinateIndex,
                        // Add original route info
                        originalRouteName: route.name,
                        originalRouteId: route.routeId || route.id
                    });
                });
            }
            
            // Update current index for the next route
            currentCoordinateIndex += coordinates.length;
        });
        
        // Create the combined GeoJSON with proper elevation data
        combinedRoute.geojson = {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                properties: {
                    name: "Full Route",
                    coordinateProperties: {
                        elevation: allElevations
                    }
                },
                geometry: {
                    type: "LineString",
                    coordinates: allCoordinates
                }
            }]
        };
        
        // Set unpaved sections
        combinedRoute.unpavedSections = allUnpavedSections;
        
        // Add surface information
        combinedRoute.surface = {
            surfaceTypes: []
        };
        
        // Calculate unpaved percentage
        if (allUnpavedSections.length > 0) {
            let unpavedDistance = 0;
            allUnpavedSections.forEach(section => {
                // Calculate distance for this section
                const sectionCoords = allCoordinates.slice(section.startIndex, section.endIndex + 1);
                let sectionDistance = 0;
                
                for (let i = 0; i < sectionCoords.length - 1; i++) {
                    const [lon1, lat1] = sectionCoords[i];
                    const [lon2, lat2] = sectionCoords[i + 1];
                    
                    // Use Haversine formula for accurate distance
                    const R = 6371e3; // Earth's radius in meters
                    const φ1 = lat1 * Math.PI / 180;
                    const φ2 = lat2 * Math.PI / 180;
                    const Δφ = (lat2 - lat1) * Math.PI / 180;
                    const Δλ = (lon2 - lon1) * Math.PI / 180;
                    
                    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    
                    sectionDistance += R * c;
                }
                
                unpavedDistance += sectionDistance;
            });
            
            const unpavedPercentage = Math.round((unpavedDistance / totalDistance) * 100);
            
            combinedRoute.surface.surfaceTypes = [
                { type: 'paved', percentage: 100 - unpavedPercentage },
                { type: 'trail', percentage: unpavedPercentage }
            ];
        } else {
            combinedRoute.surface.surfaceTypes = [
                { type: 'paved', percentage: 100 },
                { type: 'trail', percentage: 0 }
            ];
        }
        
        // Add metadata from all routes
        combinedRoute.metadata = {
            country: 'Australia', // Default
            state: '',
            lga: ''
        };
        
        // Collect all states and LGAs
        const states = new Set();
        const lgas = new Set();
        
        localRoutes.forEach(route => {
            if (route.metadata) {
                if (route.metadata.country) {
                    combinedRoute.metadata.country = route.metadata.country;
                }
                if (route.metadata.state) {
                    states.add(route.metadata.state);
                }
                if (route.metadata.lga) {
                    lgas.add(route.metadata.lga);
                }
            }
        });
        
        // Join states and LGAs with commas
        combinedRoute.metadata.state = Array.from(states).join(', ');
        combinedRoute.metadata.lga = Array.from(lgas).join(', ');
        
        return combinedRoute;
    }, [routeType, localRoutes]);
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'application/gpx+xml': ['.gpx'],
            'text/xml': ['.gpx'],
        },
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                onFileAdd(acceptedFiles[0]);
            }
        },
        noDragEventsBubbling: true,
    });

    const handleStartEditing = (e, fileId, currentName) => {
        e.preventDefault();
        e.stopPropagation();
        setEditing({ fileId, newName: currentName });
    };

    const handleCancelEditing = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditing(null);
    };

    const handleSaveEditing = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (editing?.fileId && editing.newName.trim()) {
            onFileRename(editing.fileId, editing.newName.trim());
            setEditing(null);
        }
    };

    const handleEditingChange = (e) => {
        e.stopPropagation();
        if (editing) {
            setEditing({ ...editing, newName: e.target.value });
        }
    };

    const handleColorClick = (e, routeId) => {
        e.stopPropagation();
        setColorPickerAnchor(e.currentTarget);
        setSelectedRouteId(routeId);
    };

    const handleColorClose = () => {
        setColorPickerAnchor(null);
        setSelectedRouteId(null);
    };

    const handleColorSelect = (color) => {
        if (selectedRouteId) {
            // Update the route color
            updateRoute(selectedRouteId, { color });
            
            // Find the route and set it as current to trigger immediate re-render
            const route = routes.find(r => (r.routeId || r.id) === selectedRouteId);
            if (route) {
                // Create a new route object with the updated color to force a re-render
                const updatedRoute = {
                    ...route,
                    color: color
                };
                
                // Set as current route to trigger the map update
                setCurrentRoute(updatedRoute);
            }
            
            handleColorClose();
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        
        if (active && over && active.id !== over.id) {
            const oldIndex = localRoutes.findIndex(route => (route.routeId || route.id) === active.id);
            const newIndex = localRoutes.findIndex(route => (route.routeId || route.id) === over.id);
            
            if (oldIndex !== -1 && newIndex !== -1) {
                // Update local state for immediate visual feedback
                const newRoutes = [...localRoutes];
                const [movedRoute] = newRoutes.splice(oldIndex, 1);
                newRoutes.splice(newIndex, 0, movedRoute);
                setLocalRoutes(newRoutes);
                
                // Update context state with proper order field
                reorderRoutes(oldIndex, newIndex);
            }
        }
    };

    const renderRouteContent = (route) => {
        if (editing?.fileId === (route.routeId || route.id)) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <TextField
                        size="small"
                        value={editing?.newName || ''}
                        onChange={handleEditingChange}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                                handleSaveEditing(e);
                            }
                            else if (e.key === 'Escape') {
                                handleCancelEditing(e);
                            }
                        }}
                        sx={{ flex: 1 }}
                    />
                    <IconButton size="small" onClick={handleSaveEditing}>
                        <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={handleCancelEditing}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            );
        }

        return (
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    {/* Title row */}
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 'normal', mb: 0.25 }}>{route.name}</Typography>

                    {/* Distance row with edit/delete buttons */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '20px' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <i className="fa-solid fa-route" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> {(getRouteDistance(route) / 1000).toFixed(1)}km
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, position: 'absolute', right: '36px', top: '32px' }}>
                            <IconButton
                                size="small"
                                onClick={(e) => handleStartEditing(e, route.routeId || route.id, route.name)}
                                title="Rename route"
                                sx={{ padding: '2px' }}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFileDelete(route.routeId || route.id);
                                }}
                                title="Delete route"
                                sx={{ padding: '2px' }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        <Box sx={{ position: 'absolute', right: '12px', top: '60px' }}>
                            <ColorButton
                                color={route.color || '#ee5253'}
                                onClick={(e) => handleColorClick(e, route.routeId || route.id)}
                                sx={{ width: '18px', height: '18px' }}
                            />
                        </Box>
                    </Box>

                    {/* Unpaved row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '20px' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <i className="fa-solid fa-person-biking-mountain" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> {getUnpavedPercentage(route)}% unpaved
                        </Typography>
                    </Box>

                    {/* Elevation row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '20px' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.7 }}>
                            <i className="fa-solid fa-up-right" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> &nbsp;{Math.round(getElevationGain(route)).toLocaleString()}m
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <i className="fa-solid fa-down-right" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> {Math.round(getElevationLoss(route)).toLocaleString()}m
                        </Typography>
                    </Box>
                </Box>
        );
    };

    // Calculate route summary data
    const routeSummary = useMemo(() => {
        if (!localRoutes || localRoutes.length === 0) return null;

        // Initialize summary data
        let totalDistance = 0;
        let totalAscent = 0;
        let totalUnpavedDistance = 0;
        let totalRouteDistance = 0;
        let isLoop = true;
        const countries = new Set(['Australia']); // Default country
        const states = new Set();
        const lgas = new Set();

        // Variables to store first and last points for overall loop check
        let firstRouteStart = null;
        let lastRouteEnd = null;

        // Calculate totals from all routes
        localRoutes.forEach((route, index) => {
            // Distance
            const distance = getRouteDistance(route);
            totalDistance += distance;
            totalRouteDistance += distance;

            // Elevation
            const ascent = getElevationGain(route);
            totalAscent += ascent;

            // Unpaved sections
            const unpavedPercentage = getUnpavedPercentage(route);
            totalUnpavedDistance += (distance * unpavedPercentage / 100);

            // Get coordinates for loop check
            if (route.geojson?.features?.[0]?.geometry?.coordinates) {
                const coordinates = route.geojson.features[0].geometry.coordinates;
                if (coordinates.length > 1) {
                    // Store first route's start point
                    if (index === 0) {
                        firstRouteStart = coordinates[0];
                    }
                    
                    // Store last route's end point
                    if (index === localRoutes.length - 1) {
                        lastRouteEnd = coordinates[coordinates.length - 1];
                    }
                    
                    // Individual route loop check
                    const start = coordinates[0];
                    const end = coordinates[coordinates.length - 1];
                    
                    // Calculate distance between start and end points
                    const dx = (end[0] - start[0]) * Math.cos((start[1] + end[1]) / 2 * Math.PI / 180);
                    const dy = end[1] - start[1];
                    const distance = Math.sqrt(dx * dx + dy * dy) * 111.32 * 1000; // approx meters
                    
                    // Check if this individual route is a loop (using 5km threshold)
                    const isRouteLoop = distance < 5000;
                    
                    // For a single route, set isLoop based on this route's loop status
                    if (localRoutes.length === 1) {
                        isLoop = isRouteLoop;
                    } 
                    // For multiple routes, only set isLoop to false if this route isn't a loop
                    // (we'll check multi-route loops later)
                    else if (!isRouteLoop) {
                        isLoop = false;
                    }
                }
            }

            // Location data
            if (route.metadata) {
                if (route.metadata.country) countries.add(route.metadata.country);
                if (route.metadata.state) states.add(route.metadata.state);
                if (route.metadata.lga) lgas.add(route.metadata.lga);
            }
        });

        // Check if the entire collection forms a loop (first route start connects to last route end)
        if (!isLoop && firstRouteStart && lastRouteEnd && localRoutes.length > 1) {
            const dx = (lastRouteEnd[0] - firstRouteStart[0]) * Math.cos((firstRouteStart[1] + lastRouteEnd[1]) / 2 * Math.PI / 180);
            const dy = lastRouteEnd[1] - firstRouteStart[1];
            const distance = Math.sqrt(dx * dx + dy * dy) * 111.32 * 1000; // approx meters
            
            // If the distance between first route start and last route end is small enough (within 5km), it's a loop
            if (distance < 5000) {
                isLoop = true;
            }
        }

        // Calculate unpaved percentage
        const unpavedPercentage = totalRouteDistance > 0 
            ? Math.round((totalUnpavedDistance / totalRouteDistance) * 100) 
            : 0;

        return {
            totalDistance: Math.round(totalDistance / 1000 * 10) / 10, // Convert to km with 1 decimal
            totalAscent: Math.round(totalAscent),
            unpavedPercentage,
            isLoop,
            countries: Array.from(countries),
            states: Array.from(states),
            lgas: Array.from(lgas)
        };
    }, [localRoutes]);

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '24px 16px',
            width: '100%'
        }}>
            <Paper
                {...getRootProps()}
                elevation={0}
                sx={{
                    width: '220px',
                    minHeight: '120px',
                    padding: '20px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    backgroundColor: 'rgba(35, 35, 35, 0.9)',
                    border: '2px dashed rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    '&:hover': {
                        backgroundColor: 'rgba(45, 45, 45, 0.9)',
                        border: '2px dashed rgba(255, 255, 255, 0.3)',
                    },
                    ...(isDragActive && {
                        backgroundColor: 'rgba(55, 55, 55, 0.9)',
                        border: '2px dashed rgba(255, 255, 255, 0.5)',
                        transform: 'scale(0.98)',
                    })
                }}
            >
                <input {...getInputProps()} />
                {isLoading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
                        <CircularProgress size={32} />
                        {/* Add progress display */}
                        {debugLog && debugLog.length > 0 && (
                            <Box sx={{ mt: 1, width: '100%' }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    {debugLog[debugLog.length - 1]}
                                </Typography>
                                {/* Extract progress percentage if available */}
                                {debugLog.some(log => log.includes('progress')) && (
                                    <Box sx={{ width: '100%', mt: 1 }}>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={
                                                (() => {
                                                    const progressLog = debugLog
                                                        .filter(log => log.includes('progress'))
                                                        .pop();
                                                    if (progressLog) {
                                                        const match = progressLog.match(/(\d+)%/);
                                                        return match ? parseInt(match[1]) : 0;
                                                    }
                                                    return 0;
                                                })()
                                            } 
                                        />
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                ) : (
                    <>
                        <UploadFileIcon sx={{ fontSize: 36, opacity: 0.8 }} />
                        <Typography variant="body2" sx={{ textAlign: 'center' }}>
                            {isDragActive ? 'Drop the GPX file here...' : 'Drop GPX file here or click to upload'}
                        </Typography>
                    </>
                )}
            </Paper>
            
            <Divider sx={{ my: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', width: '100%' }} />

            {/* Route Type Selector */}
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="route-type-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Route Type</InputLabel>
                <Select
                    labelId="route-type-label"
                    value={routeType}
                    onChange={(e) => {
                        const newRouteType = e.target.value;
                        setRouteType(newRouteType);
                        
                        // Auto-save route type to Firebase
                        try {
                            // Get the current user ID from Auth0
                            const userId = isAuthenticated && user?.sub ? user.sub : 'anonymous-user';
                            
                            console.log('[UploaderUI] Auto-saving route type to Firebase:', newRouteType);
                            
                            // Call the update function with the autoSave context
                            // We'll update the main document with the routeType
                            updateRouteInFirebase(
                                routes[0]?.routeId, // Use the first route's ID
                                { routeType: newRouteType }, 
                                userId, 
                                autoSave
                            )
                            .then(autoSaveId => {
                                if (autoSaveId) {
                                    console.log('[UploaderUI] Route type auto-saved to Firebase successfully', { autoSaveId });
                                } else {
                                    console.warn('[UploaderUI] Failed to auto-save route type to Firebase');
                                }
                            })
                            .catch(error => {
                                console.error('[UploaderUI] Error auto-saving route type to Firebase:', error);
                            });
                        } catch (error) {
                            console.error('[UploaderUI] Error during Firebase auto-save:', error);
                            // Continue with normal flow even if auto-save fails
                        }
                    }}
                    sx={{
                        color: 'white',
                        '.MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.23)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.4)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#4a9eff',
                        },
                        '.MuiSvgIcon-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                        }
                    }}
                >
                    <MenuItem value="Tourism">Tourism</MenuItem>
                    <MenuItem value="Event">Event</MenuItem>
                    <MenuItem value="Bikepacking">Bikepacking</MenuItem>
                    <MenuItem value="Single">Single</MenuItem>
                </Select>
            </FormControl>

            {/* Overall Route Name (only shown if a permanent route is loaded) */}
            {currentLoadedPersistentId && (
                <TextField
                    label="Overall Route Name"
                    value={localOverallName}
                    onChange={(e) => setLocalOverallName(e.target.value)}
                    onBlur={() => {
                        if (localOverallName !== overallRouteName) {
                            updateOverallRouteName(localOverallName);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            if (localOverallName !== overallRouteName) {
                                updateOverallRouteName(localOverallName);
                            }
                            e.target.blur(); // Remove focus from the input
                        }
                    }}
                    fullWidth
                    sx={{ 
                        mb: 2,
                        '& .MuiInputBase-root': {
                            color: 'white',
                        },
                        '& .MuiInputLabel-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.23)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.4)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#4a9eff',
                        },
                    }}
                    variant="outlined"
                />
            )}

            {/* Master Route (only shown for Bikepacking type) */}
            {routeType === 'Bikepacking' && masterRoute && (
                <Box sx={{ mb: 2 }}>
                    <Typography 
                        variant="subtitle2" 
                        sx={{ 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
                            paddingBottom: '8px',
                            marginBottom: '8px',
                            fontWeight: 'bold',
                            color: '#4a9eff'
                        }}
                    >
                        Full Route
                    </Typography>
                    <Box
                        onClick={() => setCurrentRoute(masterRoute)}
                        sx={{
                            backgroundColor: currentRoute?.routeId === masterRoute.routeId ? 'rgba(74, 158, 255, 0.15)' : 'rgba(35, 35, 35, 0.9)',
                            borderRadius: '4px',
                            mb: 1,
                            padding: '6px 36px 6px 8px',
                            transition: 'all 0.2s ease-in-out',
                            cursor: 'pointer',
                            position: 'relative',
                            outline: 'none',
                            border: currentRoute?.routeId === masterRoute.routeId ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid transparent',
                            '&:hover': {
                                backgroundColor: currentRoute?.routeId === masterRoute.routeId ? 'rgba(74, 158, 255, 0.2)' : 'rgba(45, 45, 45, 0.9)',
                                transform: 'scale(1.02)',
                            },
                            '&:focus-visible': {
                                outline: '2px solid rgba(255, 255, 255, 0.5)',
                                outlineOffset: '-2px',
                            },
                            minHeight: '72px',
                            width: '240px'
                        }}
                    >
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.25, pt: 0.5 }}>
                            {/* Distance row */}
                            <Box sx={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                                <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <i className="fa-solid fa-route" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> {(getRouteDistance(masterRoute) / 1000).toFixed(1)}km
                                </Typography>
                            </Box>

                            {/* Unpaved row */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '20px' }}>
                                <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <i className="fa-solid fa-person-biking-mountain" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> {getUnpavedPercentage(masterRoute)}% unpaved
                                </Typography>
                            </Box>

                            {/* Elevation row */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '20px' }}>
                                <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.7 }}>
                                    <i className="fa-solid fa-up-right" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> &nbsp;{Math.round(getElevationGain(masterRoute)).toLocaleString()}m
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <i className="fa-solid fa-down-right" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> {Math.round(getElevationLoss(masterRoute)).toLocaleString()}m
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            )}

            {localRoutes.length > 0 && (
                <>
                    <Typography 
                        variant="subtitle2" 
                        sx={{ 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
                            paddingBottom: '8px',
                            marginBottom: '8px',
                            fontWeight: 'bold',
                            color: '#4a9eff',
                            width: '100%'
                        }}
                    >
                        Stages
                    </Typography>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={localRoutes.map(route => route.routeId || route.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <List sx={{ width: '240px' }}>
                                {localRoutes.map((route) => (
                                    <DraggableRouteItem
                                        key={route.routeId || route.id}
                                        route={route}
                                    >
                                        <Box
                                            onClick={() => setCurrentRoute(route)}
                                            sx={{
                                                backgroundColor: currentRoute?.routeId === route.routeId ? 'rgba(74, 158, 255, 0.15)' : 'rgba(35, 35, 35, 0.9)',
                                                borderRadius: '4px',
                                                mb: 1,
                                                padding: '6px 36px 6px 8px',
                                                transition: 'all 0.2s ease-in-out',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                outline: 'none',
                                                border: currentRoute?.routeId === route.routeId ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid transparent',
                                                '&:hover': {
                                                    backgroundColor: currentRoute?.routeId === route.routeId ? 'rgba(74, 158, 255, 0.2)' : 'rgba(45, 45, 45, 0.9)',
                                                    transform: 'scale(1.02)',
                                                },
                                                '&:focus-visible': {
                                                    outline: '2px solid rgba(255, 255, 255, 0.5)',
                                                    outlineOffset: '-2px',
                                                },
                                                minHeight: '72px'
                                            }}
                                        >
                                            {renderRouteContent(route)}
                                        </Box>
                                    </DraggableRouteItem>
                                ))}
                            </List>
                        </SortableContext>
                    </DndContext>
                </>
            )}

            {/* Route Summary Section */}
            {routeSummary && (
                <Paper
                    elevation={0}
                    sx={{
                        width: '240px',
                        padding: '12px',
                        marginTop: '16px',
                        backgroundColor: 'rgba(35, 35, 35, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '4px',
                    }}
                >
                    <Typography 
                        variant="subtitle2" 
                        sx={{ 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
                            paddingBottom: '8px',
                            marginBottom: '8px',
                            fontWeight: 'bold',
                            color: '#4a9eff'
                        }}
                    >
                        Route Summary
                    </Typography>
                    
                    <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        rowGap: '6px',
                        columnGap: '8px',
                        '& .label': {
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '0.75rem'
                        },
                        '& .value': {
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: 'white'
                        }
                    }}>
                        <Typography className="label">Total Distance:</Typography>
                        <Typography className="value">{routeSummary.totalDistance} km</Typography>
                        
                        <Typography className="label">Total Ascent:</Typography>
                        <Typography className="value">{routeSummary.totalAscent.toLocaleString()} m</Typography>
                        
                        <Typography className="label">Unpaved:</Typography>
                        <Typography className="value">{routeSummary.unpavedPercentage}%</Typography>
                        
                        <Typography className="label">Loop:</Typography>
                        <Typography className="value">{routeSummary.isLoop ? "Yes" : "No"}</Typography>
                        
                        <Typography className="label">Country:</Typography>
                        <Typography className="value">{routeSummary.countries.join(', ') || 'Australia'}</Typography>
                        
                        {routeSummary.states.length > 0 && (
                            <>
                                <Typography className="label">State:</Typography>
                                <Typography className="value">{routeSummary.states.join(', ')}</Typography>
                            </>
                        )}
                        
                        {routeSummary.lgas.length > 0 && (
                            <>
                                <Typography className="label">LGA:</Typography>
                                <Typography className="value">{routeSummary.lgas.join(', ')}</Typography>
                            </>
                        )}
                    </Box>
                </Paper>
            )}
            
            {/* Add spacer for bottom padding */}
            <Box sx={{ height: '360px' }} />

            <Popover
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={handleColorClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <Box sx={{ 
                    p: 1.5,
                    backgroundColor: 'rgba(35, 35, 35, 0.95)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                }}>
                    <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(8, 1fr)', 
                        gap: 0.5
                    }}>
                        {PRESET_COLORS.map((color) => (
                            <ColorButton
                                key={color}
                                color={color}
                                onClick={() => handleColorSelect(color)}
                            />
                        ))}
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                        <TextField
                            label="Custom Color"
                            placeholder="#RRGGBB"
                            value={customColor}
                            onChange={(e) => {
                                const value = e.target.value;
                                setCustomColor(value);
                                if (value && !validateHexColor(value)) {
                                    setCustomColorError('Invalid hex color');
                                } else {
                                    setCustomColorError('');
                                }
                            }}
                            error={!!customColorError}
                            helperText={customColorError}
                            size="small"
                            sx={{
                                flex: 1,
                                '& .MuiInputBase-root': {
                                    color: 'white',
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.23)',
                                },
                            }}
                        />
                        <Button
                            variant="contained"
                            disabled={!customColor || !!customColorError}
                            onClick={() => {
                                if (customColor && !customColorError) {
                                    handleColorSelect(customColor);
                                    setCustomColor('');
                                }
                            }}
                            sx={{ minWidth: 'auto' }}
                        >
                            Apply
                        </Button>
                    </Box>
                </Box>
            </Popover>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error.message}
                    {error.details && (
                        <Typography variant="caption" display="block">
                            {error.details}
                        </Typography>
                    )}
                </Alert>
            )}
        </Box>
    );
};

UploaderUI.propTypes = {
    isLoading: PropTypes.bool,
    error: PropTypes.shape({
        message: PropTypes.string,
        details: PropTypes.string,
    }),
    debugLog: PropTypes.arrayOf(PropTypes.string),
    onFileAdd: PropTypes.func.isRequired,
    onFileDelete: PropTypes.func.isRequired,
    onFileRename: PropTypes.func.isRequired,
};

export default UploaderUI;
