import { useRef, useEffect, useState, useCallback } from 'react';
import { SaveDialog } from '../Sidebar/SaveDialog';
import React from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapInitializer } from './hooks/useMapInitializer';
import { useMapEvents } from './hooks/useMapEvents';
import { safelyRemoveMap } from '../../utils/mapCleanup';
import useUnifiedRouteProcessing from '../../hooks/useUnifiedRouteProcessing';
import { DistanceMarkers } from '../DistanceMarkers/DistanceMarkers';
import StyleControl, { MAP_STYLES } from '../StyleControl/StyleControl';
import SearchControl from '../SearchControl/SearchControl';
import PitchControl from '../PitchControl/PitchControl';
import { ElevationProfilePanel } from '../../../gpx/components/ElevationProfile/ElevationProfilePanel';
import { MapProvider } from '../../context/MapContext';
import { RouteProvider, useRouteContext } from '../../context/RouteContext';
import MapHeader from '../MapHeader/MapHeader';
import HeaderCustomization from '../HeaderCustomization/HeaderCustomization';
import FloatingCountdownTimer from '../MapHeader/FloatingCountdownTimer';
import { usePOIContext } from '../../../poi/context/POIContext';
import { PhotoLayer } from '../../../photo/components/PhotoLayer/PhotoLayer';
import { POIViewer } from '../../../poi/components/POIViewer/POIViewer';
import { getIconDefinition } from '../../../poi/constants/poi-icons';
import POIDetailsDrawer from '../../../poi/components/POIDetailsDrawer/POIDetailsDrawer';
import MapboxPOIMarker from '../../../poi/components/MapboxPOIMarker';
import POIDragPreview from '../../../poi/components/POIDragPreview/POIDragPreview';
import PhotoDragPreview from '../../../photo/components/PhotoDragPreview/PhotoDragPreview';
import DraggablePOILayer from '../../../poi/components/DraggablePOILayer/DraggablePOILayer.jsx';
import { ClimbMarkers } from '../ClimbMarkers/ClimbMarkers';
import LineLayer from '../../../lineMarkers/components/LineLayer/LineLayer.jsx';
import DirectLineLayer from '../../../lineMarkers/components/LineLayer/DirectLineLayer.jsx';
import { LineProvider, useLineContext } from '../../../lineMarkers/context/LineContext.jsx';
import { MapOverviewProvider, useMapOverview } from '../../../presentation/context/MapOverviewContext.jsx';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { usePhotoService } from '../../../photo/services/photoService';
import CommitChangesButton from '../CommitChangesButton/CommitChangesButton';
import './MapView.css';
import './photo-fix.css'; // Nuclear option to force photos behind UI components
import { Sidebar } from '../Sidebar';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { useClientGpxProcessing } from '../../../gpx/hooks/useClientGpxProcessing';
import { RouteLayer } from '../RouteLayer';
import { normalizeRoute } from '../../utils/routeUtils';
import { createRouteSpatialGrid } from '../../../../utils/routeUtils';
import { throttle } from 'lodash'; // Import throttle for mousemove handler

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function MapViewContent() {
    const containerRef = useRef(null); // Add a ref for the container
    
    // Get RouteContext first so it's available to POIContext
    const { 
        addRoute, 
        deleteRoute, 
        setCurrentRoute, 
        currentRoute, 
        routes,
        headerSettings,
        updateHeaderSettings,
        setChangedSections,
        changedSections,
        changedSectionsRef, // Get the ref directly
        saveCurrentState,
        loadedLineData,
        currentLoadedPersistentId
    } = useRouteContext();
    
    // Now get POIContext after RouteContext is initialized
    const { 
        pois, 
        updatePOIPosition, 
        addPOI, 
        updatePOI, 
        poiMode, 
        setPoiMode, 
        getPOIsForRoute,
        hasPOIChanges, // Get the function to check for POI changes
        clearPOIChanges, // Get the function to clear POI changes
        localPOIChanges // Get the local POI changes state directly
    } = usePOIContext();
    const { 
        isDrawing,
        hasLineChanges,
        clearLineChanges,
        localLineChanges,
        lines
    } = useLineContext();
    const [isGpxDrawerOpen, setIsGpxDrawerOpen] = useState(false);
    const currentRouteId = useRef(null);
    const [hoverCoordinates, setHoverCoordinates] = useState(null);
    const hoverMarkerRef = useRef(null);
    const routeCoordinatesRef = useRef(null); // Ref for route coordinates spatial grid
    const setHoverCoordinatesRef = useRef(setHoverCoordinates); // Ref for state setter
    const { processGpx } = useClientGpxProcessing();
    
    // State for commit changes button and save dialog
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    
    // Get contexts for tracking changes
    const { 
        changedPhotos, 
        getChangedPhotos, 
        clearPhotoChanges,
        updatePhoto
    } = usePhotoContext();
    
    // Get map overview context for tracking changes
    const {
        hasMapOverviewChanges,
        clearMapOverviewChanges,
        localMapOverviewChanges
    } = useMapOverview();
    
    // Get photo service at component level
    const photoService = usePhotoService();
    
    // Function to notify RouteContext of map state changes
    const notifyMapStateChange = useCallback(() => {
        setChangedSections(prev => ({...prev, mapState: true}));
    }, [setChangedSections]);
    
    // Effect to update the ref for setHoverCoordinates
    useEffect(() => {
        setHoverCoordinatesRef.current = setHoverCoordinates;
    }, [setHoverCoordinates]);

    // Effect to cache route coordinates and create spatial grid for optimization
    useEffect(() => {
        if (currentRoute?.geojson?.features?.[0]?.geometry?.coordinates) {
            const coordinates = currentRoute.geojson.features[0].geometry.coordinates;
            
            // Use the shared utility function to create the spatial grid
            const spatialGrid = createRouteSpatialGrid(coordinates);
            
            // Store the spatial grid
            routeCoordinatesRef.current = spatialGrid;
            
            console.log('[MapView] ✅ Created spatial grid for route tracer optimization');
        } else {
            routeCoordinatesRef.current = null; // Clear cache if no coordinates
        }
    }, [currentRoute]);

    // Initialize map using the extracted hook
    const {
        mapRef,
        mapInstance,
        isMapReady,
        isInitializing,
        streetsLayersLoaded,
        mapReady
    } = useMapInitializer({
        notifyMapStateChange,
        containerRef
    });
    
    // Set up map event handlers
    useMapEvents({
        mapInstance,
        isMapReady,
        currentRouteId,
        currentRoute,
        setHoverCoordinates,
        hoverCoordinates,
        routeCoordinatesRef // Pass the route coordinates ref
    });

    // Function to add route click handler
    const addRouteClickHandler = useCallback((map, routeId) => {
        const mainLayerId = `${routeId}-main-line`;
        // Create click handler
        const clickHandler = (e) => {
            const route = routes.find((r) => r.routeId === routeId);
            if (route) {
                setCurrentRoute(route);
            }
        };
        // Remove existing handler if any
        map.off('click', mainLayerId, clickHandler);
        // Add new click handler
        map.on('click', mainLayerId, clickHandler);
    }, [routes, setCurrentRoute]);

    // Effect to add click handlers for existing routes when map loads
    useEffect(() => {
        if (!mapInstance.current || !isMapReady)
            return;
        const map = mapInstance.current;
        
        routes.forEach(route => {
            const routeId = route.routeId || `route-${route.id}`;
            if (map.getLayer(`${routeId}-main-line`)) {
                addRouteClickHandler(map, routeId);
            }
        });
        
        // Mark routes as changed when they're loaded
        if (routes.length > 0 && setChangedSections) {
            console.log('[MapView] Marking routes as changed after loading');
            setChangedSections(prev => ({...prev, routes: true}));
        }
    }, [isMapReady, routes, addRouteClickHandler, setChangedSections]);

    // Update hover point when coordinates change - using GeoJSON source
    useEffect(() => {
        if (!mapInstance.current || !isMapReady) return;
        
        // Update the GeoJSON source if we have coordinates
        if (hoverCoordinates) {
            try {
                const source = mapInstance.current.getSource('hover-point');
                if (source) {
                    source.setData({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: hoverCoordinates
                        },
                        properties: {}
                    });
                    
                    // Show the layer
                    mapInstance.current.setLayoutProperty('hover-point', 'visibility', 'visible');
                }
            } catch (error) {
                console.error('[MapView] Error updating hover point:', error);
            }
        } else {
            // Hide the layer when no coordinates
            try {
                mapInstance.current.setLayoutProperty('hover-point', 'visibility', 'none');
            } catch (error) {
                // Ignore errors when hiding (might happen during initialization)
            }
        }
    }, [hoverCoordinates, isMapReady]);
    
    // Effect to fit bounds when current route changes
    useEffect(() => {
        if (!mapInstance.current || !isMapReady || !currentRoute?.geojson)
            return;
        
        // Get route bounds
        if (currentRoute.geojson?.features?.[0]?.geometry?.type === 'LineString') {
            const feature = currentRoute.geojson.features[0];
            const coordinates = feature.geometry.coordinates;
            
            if (coordinates && coordinates.length > 0) {
                try {
                    const bounds = new mapboxgl.LngLatBounds();
                    
                    coordinates.forEach((coord) => {
                        if (coord.length >= 2) {
                            bounds.extend([coord[0], coord[1]]);
                        }
                    });
                    
                    // Always fit bounds to show the entire route with substantial padding
                    mapInstance.current.fitBounds(bounds, {
                        padding: 200,  // Significant padding to zoom out and show more context
                        duration: 1500
                    });
                } catch (error) {
                    console.error('[MapView] Error fitting bounds to route:', error);
                }
            }
        }
    }, [mapInstance, isMapReady, currentRoute]);
    
    // Initialize routes using the unified approach - moved to component top level
    const { initialized: routesInitialized } = useUnifiedRouteProcessing(routes, {
        batchProcess: true,
        onInitialized: () => {
            console.log('[MapView] Routes initialized with unified approach');
        }
    });
    
    // Animation effect removed as requested
    const handleUploadGpx = async (file, processedRoute) => {
        if (!file && !processedRoute) {
            setIsGpxDrawerOpen(true);
            return;
        }
        try {
            // Process the new GPX file or use provided processed route
            const gpxResult = processedRoute || (file ? await processGpx(file) : null);
            if (!gpxResult) {
                console.error('[MapView] No GPX result available');
                return;
            }
            // Normalize the new route
            const normalizedRoute = normalizeRoute(gpxResult);
            console.log('[MapView] Normalized route:', normalizedRoute);
            // Add to existing routes
            addRoute(normalizedRoute);
            // Set as current route
            setCurrentRoute(normalizedRoute);
            // Explicitly mark routes as changed after uploading GPX
            console.log('[MapView] Marking routes as changed after GPX upload');
            setChangedSections(prev => ({...prev, routes: true}));
            setIsGpxDrawerOpen(false);
        }
        catch (error) {
            console.error('[MapView] Error processing GPX:', error);
        }
    };

    const [isPOIDrawerOpen, setIsPOIDrawerOpen] = useState(false);
    const [dragPreview, setDragPreview] = useState(null);
    const [onPoiPlacementClick, setPoiPlacementClick] = useState(undefined);

    // Update cursor style and click handler based on POI mode
    useEffect(() => {
        if (!mapInstance.current || !isMapReady)
            return;
        const map = mapInstance.current;
        const canvas = map.getCanvas();
        if (!canvas)
            return;
        // Set cursor style based on POI or line drawing mode
        canvas.style.cursor = (poiMode === 'regular' || isDrawing) ? 'crosshair' : '';
        // Handle clicks only in regular POI mode
        if (poiMode === 'regular' && !isDrawing) {
            const clickHandler = (e) => {
                if (onPoiPlacementClick) {
                    const coords = [e.lngLat.lng, e.lngLat.lat];
                    onPoiPlacementClick(coords);
                }
            };
            map.on('click', clickHandler);
            return () => {
                map.off('click', clickHandler);
                canvas.style.cursor = '';
            };
        }
    }, [poiMode, onPoiPlacementClick, isMapReady, dragPreview, isDrawing]);

    const handleAddPOI = () => {
        const newIsOpen = !isPOIDrawerOpen;
        setIsPOIDrawerOpen(newIsOpen);
        setPoiMode(newIsOpen ? 'regular' : 'none');
        if (!newIsOpen) {
            setPoiPlacementClick(undefined);
        }
    };

    const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
    const [selectedPOIDetails, setSelectedPOIDetails] = useState(null);
    const [selectedPOI, setSelectedPOI] = useState(null);

    const handlePOIClick = (poi) => {
        setSelectedPOI(poi);
    };

    const handlePOICreation = (icon, category, coordinates) => {
        console.log('handlePOICreation called with:', {
            icon,
            category,
            coordinates,
            coordinatesString: `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`
        });
        
        // Check if coordinates are valid
        if (!coordinates || coordinates.length !== 2 || 
            typeof coordinates[0] !== 'number' || 
            typeof coordinates[1] !== 'number') {
            console.error('Invalid coordinates:', coordinates);
            return;
        }
        
        // Log the current map center for comparison
        if (mapInstance.current) {
            const center = mapInstance.current.getCenter();
            console.log('Map center vs POI coordinates:', {
                mapCenter: [center.lng, center.lat],
                mapCenterString: `${center.lng.toFixed(6)}, ${center.lat.toFixed(6)}`,
                poiCoordinates: coordinates,
                poiCoordinatesString: `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`,
                difference: {
                    lng: coordinates[0] - center.lng,
                    lat: coordinates[1] - center.lat
                }
            });
        }
        
        // Clear any existing temporary POI details
        setSelectedPOIDetails(null);
        
        // Wait a moment for the UI to update before setting new details
        setTimeout(() => {
            console.log('Setting selectedPOIDetails with coordinates:', coordinates);
            setSelectedPOIDetails({ iconName: icon, category, coordinates });
            setDetailsDrawerOpen(true);
            setPoiMode('none');
            setIsPOIDrawerOpen(false);
        }, 0);
    };

    const handlePOIDetailsSave = async (details) => {
        if (!selectedPOIDetails)
            return;
        try {
            // Get current route ID
            const currentRouteId = currentRoute?.routeId || `route-${currentRoute?.id}`;
            
            console.log('POI details before saving:', {
                selectedPOIDetails,
                details,
                coordinatesString: `${selectedPOIDetails.coordinates[0].toFixed(6)}, ${selectedPOIDetails.coordinates[1].toFixed(6)}`
            });
            
            // Create POI with all details
            const poiDetails = {
                type: 'draggable',
                coordinates: selectedPOIDetails.coordinates,
                name: details.name,
                description: details.description,
                category: selectedPOIDetails.category,
                icon: selectedPOIDetails.iconName,
                // Include the Google Places link so POIContext can process it
                googlePlacesLink: details.googlePlacesLink
            };

            console.log('[POI_DETAILS_FOR_MONGODB]', JSON.stringify(poiDetails, null, 2));
            
            // Add POI to context
            console.log('Adding POI to context with coordinates:', {
                coordinates: poiDetails.coordinates,
                coordinatesString: `${poiDetails.coordinates[0].toFixed(6)}, ${poiDetails.coordinates[1].toFixed(6)}`
            });
            
            addPOI(poiDetails);
            
            // Clear temporary marker and close drawer
            setSelectedPOIDetails(null);
            setDetailsDrawerOpen(false);
        }
        catch (error) {
            console.error('Error saving POI:', error);
        }
    };

    const handleDeleteRoute = (routeId) => {
        console.log('[MapView][DELETE] Starting deletion process for route:', routeId);
        console.log('[MapView][DELETE] Current routes:', routes.map(r => ({
            id: r.id,
            routeId: r.routeId,
            name: r.name,
            _type: r._type
        })));
        if (!mapInstance.current) {
            console.error('[MapView][DELETE] Map instance not available');
            return;
        }
        const map = mapInstance.current;
        const style = map.getStyle();
        if (!style || !style.layers) {
            console.error('[MapView][DELETE] Map style or layers not available');
            return;
        }
        
        // Normalize routeId to handle different formats
        // Some components might use 'route-123' while others use just '123'
        const normalizedRouteId = routeId.startsWith('route-') ? routeId : `route-${routeId}`;
        const baseRouteId = routeId.startsWith('route-') ? routeId.substring(6) : routeId;
        
        // Create an array of possible ID formats to search for
        const possibleRouteIds = [
            routeId,
            normalizedRouteId,
            baseRouteId
        ];
        
        console.log('[MapView][DELETE] Searching for layers with possible IDs:', possibleRouteIds);
        
        // Step 1: Find all layers associated with this route using all possible ID formats
        console.log('[MapView][DELETE] Finding layers for route:', routeId);
        const allLayers = style.layers
            .map(layer => layer.id)
            .filter(id => 
                // Check if layer ID contains any of the possible route IDs
                possibleRouteIds.some(possibleId => id.includes(possibleId)) ||
                // Check for unpaved section layers with any possible ID format
                possibleRouteIds.some(possibleId => id.startsWith(`unpaved-section-layer-${possibleId}`)) ||
                possibleRouteIds.some(possibleId => id.startsWith(`unpaved-sections-layer-${possibleId}`))
            );
        
        console.log('[MapView][DELETE] Found map style layers:', allLayers);
        
        // Add known layer patterns for all possible ID formats
        const knownLayerPatterns = [];
        
        // Generate patterns for each possible ID format
        possibleRouteIds.forEach(id => {
            knownLayerPatterns.push(
                `${id}-main-border`,
                `${id}-main-line`,
                `${id}-hover`,
                `${id}-hover-line`,
                `${id}-surface`,
                `${id}-unpaved-line`,
                `unpaved-section-layer-${id}`,
                `unpaved-sections-layer-${id}`
            );
        });
        
        // Also check for RouteLayer.js specific naming patterns
        possibleRouteIds.forEach(id => {
            knownLayerPatterns.push(
                `${id}-main-line`,
                `${id}-main-border`,
                `${id}-hover-line`,
                `unpaved-sections-layer-${id}`
            );
        });
        
        console.log('[MapView][DELETE] Added known layer patterns:', knownLayerPatterns);
        
        // Combine all layer IDs and remove duplicates
        const layersToRemove = [...new Set([...allLayers, ...knownLayerPatterns])];
        console.log('[MapView][DELETE] Final layers to remove:', layersToRemove);
        
        // Step 2: Remove all layers first
        console.log('[MapView][DELETE] Starting layer removal process');
        layersToRemove.forEach(layerId => {
            if (map.getLayer(layerId)) {
                try {
                    console.log('[MapView][DELETE] Removing layer:', layerId);
                    map.removeLayer(layerId);
                    console.log('[MapView][DELETE] Successfully removed layer:', layerId);
                }
                catch (error) {
                    console.error('[MapView][DELETE] Error removing layer:', layerId, error);
                }
            }
            else {
                console.log('[MapView][DELETE] Layer not found:', layerId);
            }
        });
        
        // Step 3: Find all sources associated with this route using all possible ID formats
        const sourcesToRemove = [];
        
        // Generate source patterns for each possible ID format
        possibleRouteIds.forEach(id => {
            sourcesToRemove.push(
                `${id}-main`,
                `${id}-unpaved`,
                `unpaved-section-${id}`,
                `unpaved-sections-${id}`
            );
        });
        
        // Get all source IDs from the style that match any of our patterns
        const allSources = Object.keys(style.sources || {})
            .filter(id => 
                sourcesToRemove.includes(id) || 
                possibleRouteIds.some(routeId => id.startsWith(`unpaved-section-${routeId}-`)) ||
                possibleRouteIds.some(routeId => id.startsWith(`unpaved-sections-${routeId}-`))
            );
        
        console.log('[MapView][DELETE] Found sources to remove:', allSources);
        
        // Step 4: Remove all sources after a brief delay to ensure layers are fully removed
        setTimeout(() => {
            console.log('[MapView][DELETE] Starting source removal process after delay');
            allSources.forEach(sourceId => {
                if (map.getSource(sourceId)) {
                    try {
                        console.log('[MapView][DELETE] Removing source:', sourceId);
                        map.removeSource(sourceId);
                        console.log('[MapView][DELETE] Successfully removed source:', sourceId);
                    }
                    catch (error) {
                        console.error('[MapView][DELETE] Error removing source:', sourceId, error);
                    }
                }
                else {
                    console.log('[MapView][DELETE] Source not found:', sourceId);
                }
            });
            
            // Log state after source removal
            const currentStyle = map.getStyle();
            console.log('[MapView][DELETE] Remaining sources:', Object.keys(currentStyle?.sources || {}));
            
            // Force a map redraw after all cleanup
            setTimeout(() => {
                try {
                    console.log('[MapView][DELETE] Forcing map redraw');
                    map.resize();
                    
                    // Additional map refresh to ensure rendering is updated
                    if (map.repaint) {
                        map.repaint = true;
                    }
                } catch (error) {
                    console.error('[MapView][DELETE] Error during map redraw:', error);
                }
            }, 200);
        }, 200); // Increased delay to ensure layers are fully removed
        
        // Step 5: Delete from context
        console.log('[MapView][DELETE] Calling deleteRoute with ID:', routeId);
        deleteRoute(routeId);
        
        // Clear local reference
        if (currentRouteId.current === routeId) {
            console.log('[MapView][DELETE] Clearing current route reference:', currentRouteId.current);
            currentRouteId.current = null;
        }
        
        // Log final state
        console.log('[MapView][DELETE] Deletion process complete for route:', routeId);
    };

    // Handle POI drag end
    const handlePOIDragEnd = useCallback((poi, newCoordinates) => {
        updatePOIPosition(poi.id, newCoordinates);
    }, [updatePOIPosition]);

    // Create the MapProvider component
    const mapProviderProps = {
        value: {
            map: mapInstance.current,
            isMapReady,
            isInitializing,
            hoverCoordinates,
            setHoverCoordinates,
            onPoiPlacementClick,
            setPoiPlacementClick,
            dragPreview,
            setDragPreview,
            poiPlacementMode: poiMode === 'regular',
            setPoiPlacementMode: (mode) => setPoiMode(mode ? 'regular' : 'none')
        }
    };

    // Create the main container div
    const containerProps = {
        ref: containerRef,
        className: "w-full h-full relative"
    };

    // Create the MapHeader component
    const mapHeaderProps = {
        title: currentRoute?._loadedState?.name || currentRoute?.name || 'Untitled Route',
        color: headerSettings.color,
        logoUrl: headerSettings.logoUrl,
        username: headerSettings.username,
        type: currentRoute?._loadedState?.type || currentRoute?.type,
        eventDate: currentRoute?._loadedState?.eventDate || currentRoute?.eventDate
    };

    // Create the map container div
    const mapContainerProps = {
        className: "map-container",
        ref: mapRef
    };

    // Create the loading overlay
    const loadingOverlayProps = {
        sx: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }
    };

    // Create the CircularProgress component
    const circularProgressProps = {
        size: 60,
        sx: { mb: 2 }
    };

    // Create the Typography component
    const typographyProps = {
        variant: "h6",
        color: "white"
    };

    // Create the Sidebar component
    const sidebarProps = {
        onUploadGpx: handleUploadGpx,
        onAddPhotos: () => { },
        onAddPOI: handleAddPOI,
        mapReady: mapReady,
        onItemClick: () => { },
        onToggleRoute: () => { },
        onToggleGradient: () => { },
        onToggleSurface: () => { },
        onPlacePOI: () => { },
        onDeleteRoute: handleDeleteRoute
    };

    // Calculate total number of changes
    const getTotalChangeCount = useCallback(() => {
        // Count photo changes
        const photoChangeCount = changedPhotos ? changedPhotos.size : 0;
        
        // Use the ref directly to get the most up-to-date changes
        const currentChangedSections = changedSectionsRef.current || {};
        
        // Count route changes (check if any route-related sections have changed)
        const routeChangeCount = Object.keys(currentChangedSections).filter(key => 
            ['routes', 'mapState', 'description', 'metadata', 'mapOverview'].includes(key)
        ).length;
        
        // Check for local POI changes - first check if we can access localPOIChanges directly
        let hasLocalPOIChanges = false;
        
        // Try multiple approaches to detect POI changes
        if (typeof hasPOIChanges === 'function') {
            // Method 1: Use the hasPOIChanges function if available
            try {
                hasLocalPOIChanges = hasPOIChanges();
                console.log('[MapView] POI changes detected via hasPOIChanges():', hasLocalPOIChanges);
            } catch (error) {
                console.error('[MapView] Error calling hasPOIChanges():', error);
            }
        } else if (localPOIChanges !== undefined) {
            // Method 2: Use the localPOIChanges state directly if exposed
            hasLocalPOIChanges = localPOIChanges;
            console.log('[MapView] POI changes detected via localPOIChanges state:', hasLocalPOIChanges);
        }
        
        // Check for local Line changes
        let hasLocalLineChanges = false;
        
        // Try multiple approaches to detect line changes
        if (typeof hasLineChanges === 'function') {
            // Method 1: Use the hasLineChanges function if available
            try {
                hasLocalLineChanges = hasLineChanges();
                console.log('[MapView] Line changes detected via hasLineChanges():', hasLocalLineChanges);
            } catch (error) {
                console.error('[MapView] Error calling hasLineChanges():', error);
            }
        } else if (localLineChanges !== undefined) {
            // Method 2: Use the localLineChanges state directly if exposed
            hasLocalLineChanges = localLineChanges;
            console.log('[MapView] Line changes detected via localLineChanges state:', hasLocalLineChanges);
        }
        
        // Check for local Map Overview changes
        let hasLocalMapOverviewChanges = false;
        
        // Try multiple approaches to detect Map Overview changes
        if (typeof hasMapOverviewChanges === 'function') {
            // Method 1: Use the hasMapOverviewChanges function if available
            try {
                hasLocalMapOverviewChanges = hasMapOverviewChanges();
                console.log('[MapView] Map Overview changes detected via hasMapOverviewChanges():', hasLocalMapOverviewChanges);
            } catch (error) {
                console.error('[MapView] Error calling hasMapOverviewChanges():', error);
            }
        } else if (localMapOverviewChanges !== undefined) {
            // Method 2: Use the localMapOverviewChanges state directly if exposed
            hasLocalMapOverviewChanges = localMapOverviewChanges;
            console.log('[MapView] Map Overview changes detected via localMapOverviewChanges state:', hasLocalMapOverviewChanges);
        }
        
        // Count POI changes - check both the changedSections and the local POI changes
        // This ensures we catch POI changes even if they're only tracked locally in POIContext
        const poiChangeCount = (currentChangedSections.pois || hasLocalPOIChanges) ? 1 : 0;
        
        // Count Line changes - check both the changedSections and the local Line changes
        const lineChangeCount = (currentChangedSections.lines || hasLocalLineChanges) ? 1 : 0;
        
        // Count Map Overview changes - check both the changedSections and the local Map Overview changes
        const mapOverviewChangeCount = (currentChangedSections.mapOverview || hasLocalMapOverviewChanges) ? 1 : 0;
        
        // Calculate total changes
        const totalCount = photoChangeCount + routeChangeCount + poiChangeCount + lineChangeCount + mapOverviewChangeCount;
        
        // Debug logging for change tracking
        console.log('[MapView] getTotalChangeCount:', {
            photoChangeCount,
            routeChangeCount,
            poiChangeCount,
            lineChangeCount,
            mapOverviewChangeCount,
            totalCount,
            changedSections: Object.keys(currentChangedSections),
            changedSectionsRef: currentChangedSections,
            changedPhotosSize: changedPhotos ? changedPhotos.size : 0,
            hasLocalPOIChanges,
            hasPOIChangesAvailable: typeof hasPOIChanges === 'function',
            localPOIChangesAvailable: localPOIChanges !== undefined,
            hasLocalLineChanges,
            hasLineChangesAvailable: typeof hasLineChanges === 'function',
            localLineChangesAvailable: localLineChanges !== undefined,
            hasLocalMapOverviewChanges,
            hasMapOverviewChangesAvailable: typeof hasMapOverviewChanges === 'function',
            localMapOverviewChangesAvailable: localMapOverviewChanges !== undefined
        });
        
        // Force changes to be detected if we have routes but no changes are tracked
        if (totalCount === 0 && routes.length > 0) {
            console.log('[MapView] Routes exist but no changes detected, checking if we need to force route changes');
            
            // Only log this, don't force changes here as it would cause an infinite loop
            // The actual forcing happens in handleCommitChanges
        }
        
        return totalCount;
    }, [changedPhotos, changedSectionsRef, routes, hasPOIChanges]);
    
    // Debug effect to log change counts
    useEffect(() => {
        const photoCount = changedPhotos ? changedPhotos.size : 0;
        
        // Use the ref directly to get the most up-to-date changes
        const currentChangedSections = changedSectionsRef.current || {};
        
        const routeCount = Object.keys(currentChangedSections).filter(key => 
            ['routes', 'mapState', 'description', 'metadata', 'mapOverview'].includes(key)
        ).length;
        
        // Check for local POI changes - try multiple approaches
        let hasLocalPOIChanges = false;
        
        if (typeof hasPOIChanges === 'function') {
            // Method 1: Use the hasPOIChanges function if available
            try {
                hasLocalPOIChanges = hasPOIChanges();
            } catch (error) {
                console.error('[MapView] Error calling hasPOIChanges() in debug effect:', error);
            }
        } else if (localPOIChanges !== undefined) {
            // Method 2: Use the localPOIChanges state directly if exposed
            hasLocalPOIChanges = localPOIChanges;
        }
        
        // Check for local Line changes - try multiple approaches
        let hasLocalLineChanges = false;
        
        if (typeof hasLineChanges === 'function') {
            // Method 1: Use the hasLineChanges function if available
            try {
                hasLocalLineChanges = hasLineChanges();
            } catch (error) {
                console.error('[MapView] Error calling hasLineChanges() in debug effect:', error);
            }
        } else if (localLineChanges !== undefined) {
            // Method 2: Use the localLineChanges state directly if exposed
            hasLocalLineChanges = localLineChanges;
        }
        
        // Check for local Map Overview changes - try multiple approaches
        let hasLocalMapOverviewChanges = false;
        
        if (typeof hasMapOverviewChanges === 'function') {
            // Method 1: Use the hasMapOverviewChanges function if available
            try {
                hasLocalMapOverviewChanges = hasMapOverviewChanges();
            } catch (error) {
                console.error('[MapView] Error calling hasMapOverviewChanges() in debug effect:', error);
            }
        } else if (localMapOverviewChanges !== undefined) {
            // Method 2: Use the localMapOverviewChanges state directly if exposed
            hasLocalMapOverviewChanges = localMapOverviewChanges;
        }
        
        // Count POI changes - check both the changedSections and the local POI changes
        const poiCount = (currentChangedSections.pois || hasLocalPOIChanges) ? 1 : 0;
        
        // Count Line changes - check both the changedSections and the local Line changes
        const lineCount = (currentChangedSections.lines || hasLocalLineChanges) ? 1 : 0;
        
        // Count Map Overview changes - check both the changedSections and the local Map Overview changes
        const mapOverviewCount = (currentChangedSections.mapOverview || hasLocalMapOverviewChanges) ? 1 : 0;
        
        // Calculate total count
        const totalCount = photoCount + routeCount + poiCount + lineCount + mapOverviewCount;
        
        console.log('[MapView] Change counts:', {
            photoCount,
            routeCount,
            poiCount,
            lineCount,
            mapOverviewCount,
            totalCount,
            changedSections: Object.keys(currentChangedSections),
            changedSectionsRef: currentChangedSections,
            hasLocalPOIChanges,
            hasPOIChangesAvailable: typeof hasPOIChanges === 'function',
            localPOIChangesAvailable: localPOIChanges !== undefined,
            hasLocalLineChanges,
            hasLineChangesAvailable: typeof hasLineChanges === 'function',
            localLineChangesAvailable: localLineChanges !== undefined,
            hasLocalMapOverviewChanges,
            hasMapOverviewChangesAvailable: typeof hasMapOverviewChanges === 'function',
            localMapOverviewChangesAvailable: localMapOverviewChanges !== undefined
        });
    }, [changedPhotos, changedSectionsRef, hasPOIChanges, localPOIChanges, hasLineChanges, localLineChanges, hasMapOverviewChanges, localMapOverviewChanges]);
    
    // Handle commit changes - opens the save dialog
    const handleCommitChanges = () => {
        const totalChanges = getTotalChangeCount();
        
        // Force changes to be detected if we have routes
        if (totalChanges === 0 && routes.length > 0) {
            console.log('[MapView] No changes detected but routes exist, forcing route changes');
            setChangedSections(prev => ({...prev, routes: true}));
            
            // Wait a moment for the state to update, then call this function again
            setTimeout(() => {
                console.log('[MapView] Re-triggering commit after forcing route changes');
                handleCommitChanges();
            }, 100);
            return; // Return and let the timeout trigger the commit again
        }
        
        if (totalChanges === 0) {
            console.log('[MapView] No changes to commit');
            return;
        }
        
        // Open the save dialog instead of directly saving
        setIsSaveDialogOpen(true);
    };
    
    // Handle save dialog submit
    const handleSaveDialogSubmit = async (formData) => {
        setIsUploading(true);
        setUploadProgress(0);
        
        try {
            // Check if we have photo changes
            if (changedPhotos.size > 0) {
                // Get photos that need to be uploaded
                const photosToUpload = getChangedPhotos();
                
                if (photosToUpload.length > 0) {
                    console.log('[MapView] Committing changes for photos:', photosToUpload.length);
                    
                    // Upload photos in parallel with progress tracking
                    let completedUploads = 0;
                    
                    await Promise.all(photosToUpload.map(async (photo) => {
                        try {
                            // Skip photos that are already uploaded
                            if (!photo.isLocal) {
                                completedUploads++;
                                const newProgress = (completedUploads / photosToUpload.length) * 50; // Photos are 50% of progress
                                setUploadProgress(newProgress);
                                return;
                            }
                            
                            // Upload to Cloudinary
                            const result = await photoService.uploadPhotoWithProgress(
                                photo._originalFile,
                                (progress) => {
                                    // Update overall progress (photos are 50% of total progress)
                                    const photoProgress = progress.percent || 0;
                                    const newProgress = ((completedUploads + (photoProgress / 100)) / photosToUpload.length) * 50;
                                    setUploadProgress(newProgress);
                                }
                            );
                            
                            // Update photo with Cloudinary URLs
                            updatePhoto(photo.url, {
                                url: result.url,
                                tinyThumbnailUrl: result.tinyThumbnailUrl,
                                thumbnailUrl: result.thumbnailUrl,
                                mediumUrl: result.mediumUrl,
                                largeUrl: result.largeUrl,
                                publicId: result.publicId,
                                isLocal: false,
                                _originalFile: undefined,
                                _blobs: undefined
                            });
                            
                            completedUploads++;
                        } catch (error) {
                            console.error(`[MapView] Failed to upload photo:`, error);
                            // Continue with other photos
                            completedUploads++;
                        }
                    }));
                    
                    // Clear tracked photo changes
                    clearPhotoChanges();
                }
            }
            
            // Check if we have route changes - use the ref directly
            const currentChangedSections = changedSectionsRef.current || {};
            const hasRouteChanges = Object.keys(currentChangedSections).length > 0;
            
            if (hasRouteChanges) {
                console.log('[MapView] Committing route changes');
                
                // Set progress to 50% before saving route (photos were first 50%)
                setUploadProgress(50);
                
                // Get lines data from LineContext if available
                let linesToSave = loadedLineData || [];
                
                // Get the lines from the LineContext
                console.log('[MapView] Line context is available, checking for lines');
                
                // We already have access to the LineContext at the top level
                if (hasLineChanges && hasLineChanges()) {
                    console.log('[MapView] Line changes detected, using lines from context');
                    
                    // Use the lines state that we already have access to from the top level
                    if (lines && lines.length > 0) {
                        console.log('[MapView] Using lines from LineContext:', lines.length);
                        linesToSave = lines;
                    } else {
                        console.log('[MapView] No lines found in LineContext, using loadedLineData:', loadedLineData ? loadedLineData.length : 0);
                    }
                }
                
                // Log the lines data for debugging
                console.log('[MapView] Lines data being saved:', JSON.stringify(linesToSave));
                
                // Save the current state with the form data
                await saveCurrentState(
                    formData.name,
                    formData.type,
                    formData.isPublic,
                    linesToSave,
                    formData.eventDate
                );
                
                // Set progress to 100% after route save
                setUploadProgress(100);
                
                // Clear POI changes after saving
                if (typeof clearPOIChanges === 'function') {
                    clearPOIChanges();
                }
                
                // Clear Line changes after saving
                if (typeof clearLineChanges === 'function') {
                    clearLineChanges();
                }
                
                // Clear Map Overview changes after saving
                if (typeof clearMapOverviewChanges === 'function') {
                    clearMapOverviewChanges();
                }
            }
            
            console.log('[MapView] All changes committed successfully');
            
            // Close the save dialog
            setIsSaveDialogOpen(false);
        } catch (error) {
            console.error('[MapView] Error committing changes:', error);
        } finally {
            setIsUploading(false);
        }
    };

    // Create the map layers div
    const mapLayersProps = {
        className: "map-layers"
    };

    // Create the DraggablePOILayer component
    const draggablePOILayerProps = {
        onPOIClick: handlePOIClick,
        onPOIDragEnd: handlePOIDragEnd,
        key: "draggable-pois"
    };

    // Create the PhotoLayer component
    const photoLayerProps = {
        key: "photo-layer"
    };

    // Create the LineLayer component
    const lineLayerProps = {
        key: "line-layer"
    };

    // Create the ClimbMarkers component
    const climbMarkersProps = {
        map: mapInstance.current,
        route: currentRoute,
        key: "climb-markers"
    };

    // Create the header customization container div
    const headerCustomizationContainerProps = {
        className: "header-customization-container",
        style: {
            position: 'absolute',
            top: '75px',
            left: '70px', // Changed from right to left
            zIndex: 1000
        }
    };

    // Create the HeaderCustomization component
    const headerCustomizationProps = {
        color: headerSettings.color,
        logoUrl: headerSettings.logoUrl,
        username: headerSettings.username,
        onSave: updateHeaderSettings
    };

    // Create the drag preview props based on the type of dragPreview
    let dragPreviewComponent = null;
    if (dragPreview) {
        if (dragPreview.type === 'poi') {
            // POI drag preview
            dragPreviewComponent = React.createElement(POIDragPreview, {
                icon: dragPreview.icon,
                category: dragPreview.category,
                onPlace: (coordinates) => {
                    handlePOICreation(dragPreview.icon, dragPreview.category, coordinates);
                    setDragPreview(null);
                }
            });
        } else if (dragPreview.type === 'photo') {
            // Photo drag preview
            dragPreviewComponent = React.createElement(PhotoDragPreview, {
                photo: dragPreview.photo,
                initialPosition: dragPreview.initialPosition,
                onPlace: () => {
                    // Clear the drag preview when the photo is placed
                    setDragPreview(null);
                }
            });
        } else if (dragPreview.type === 'draggable') {
            // Draggable POI preview (from POIDrawer)
            dragPreviewComponent = React.createElement(POIDragPreview, {
                icon: dragPreview.icon,
                category: dragPreview.category,
                onPlace: (coordinates) => {
                    handlePOICreation(dragPreview.icon, dragPreview.category, coordinates);
                    setDragPreview(null);
                }
            });
        }
    }

    // Create the MapboxPOIMarker component props if selectedPOIDetails exists
    const mapboxPOIMarkerProps = selectedPOIDetails ? {
        poi: {
            id: 'temp-poi',
            type: 'draggable',
            coordinates: selectedPOIDetails.coordinates,
            name: getIconDefinition(selectedPOIDetails.iconName)?.label || '',
            category: selectedPOIDetails.category,
            icon: selectedPOIDetails.iconName
        }
    } : null;

    // Create the route filename div
    const routeFilenameProps = {
        className: "route-filename"
    };

    // Create the ElevationProfilePanel component
    const elevationProfilePanelProps = {
        route: currentRoute
    };

    // Create the DistanceMarkers component
    const distanceMarkersProps = {
        map: mapInstance.current
    };

    // Create the POIDetailsDrawer component props if selectedPOIDetails exists
    const poiDetailsDrawerProps = selectedPOIDetails ? {
        isOpen: detailsDrawerOpen,
        onClose: () => {
            setDetailsDrawerOpen(false);
            setSelectedPOIDetails(null);
            setPoiMode('none');
            setIsPOIDrawerOpen(false);
        },
        iconName: selectedPOIDetails.iconName,
        category: selectedPOIDetails.category,
        onSave: handlePOIDetailsSave
    } : null;

    // Create the POIViewer component props if selectedPOI exists
    const poiViewerProps = selectedPOI ? {
        poi: selectedPOI,
        onClose: () => setSelectedPOI(null),
        onUpdate: updatePOI
    } : null;

    return React.createElement(MapProvider, mapProviderProps, 
        React.createElement('div', containerProps, [
            // MapHeader
            React.createElement(MapHeader, mapHeaderProps),
            
            // Map container
            React.createElement('div', mapContainerProps),
            
            // Loading overlay
            !isMapReady && React.createElement(Box, loadingOverlayProps, [
                React.createElement(CircularProgress, circularProgressProps),
                React.createElement(Typography, typographyProps, "Loading map...")
            ]),
            
            // Sidebar
            React.createElement(Sidebar, sidebarProps),
            
            // Map layers
            isMapReady && React.createElement('div', mapLayersProps, [
                React.createElement(DraggablePOILayer, draggablePOILayerProps),
                React.createElement(PhotoLayer, photoLayerProps),
                React.createElement(LineLayer, lineLayerProps),
                // Add DirectLineLayer for loaded line data
                loadedLineData && loadedLineData.length > 0 && React.createElement(DirectLineLayer, {
                    map: mapInstance.current,
                    lines: loadedLineData,
                    key: "direct-line-layer"
                }),
                currentRoute && React.createElement(ClimbMarkers, climbMarkersProps)
            ]),
            
            // Header customization
            isMapReady && React.createElement('div', headerCustomizationContainerProps,
                React.createElement(HeaderCustomization, headerCustomizationProps)
            ),
            
            // Floating Countdown Timer for event routes
            isMapReady && currentRoute && 
            (currentRoute?._loadedState?.type === 'event' || currentRoute?.type === 'event') && 
            (currentRoute?._loadedState?.eventDate || currentRoute?.eventDate) && 
            React.createElement(FloatingCountdownTimer, { 
                eventDate: currentRoute?._loadedState?.eventDate || currentRoute?.eventDate 
            }),
            
            // Drag preview (POI or Photo)
            dragPreviewComponent,
            
            // Selected POI details marker
            selectedPOIDetails && React.createElement(MapboxPOIMarker, mapboxPOIMarkerProps),
            
            // Unified route processing
            isMapReady && mapInstance.current && React.createElement(React.Fragment, null, [
                // Render routes using RouteLayer component
                React.createElement(React.Fragment, null,
                    routes.map(route => 
                        React.createElement(RouteLayer, {
                            map: mapInstance.current,
                            route: route,
                            key: route.id || route.routeId
                        })
                    )
                ),
                
                // Route information and components
                currentRoute && React.createElement(React.Fragment, null, [
                    React.createElement('div', routeFilenameProps, 
                        currentRoute._type === 'loaded' && currentRoute._loadedState 
                            ? currentRoute._loadedState.name 
                            : currentRoute.name || 'Untitled Route'
                    ),
                    React.createElement(ElevationProfilePanel, elevationProfilePanelProps),
                    React.createElement(DistanceMarkers, distanceMarkersProps)
                ])
            ]),
            
            // POI details drawer
            selectedPOIDetails && React.createElement(POIDetailsDrawer, poiDetailsDrawerProps),
            
            // Selected POI viewer
            selectedPOI && React.createElement(POIViewer, poiViewerProps),
            
            // Commit Changes Button
            React.createElement(CommitChangesButton, {
                isVisible: getTotalChangeCount() > 0,
                isUploading: isUploading,
                uploadProgress: uploadProgress,
                onClick: handleCommitChanges,
                changeCount: getTotalChangeCount(),
                position: 'bottom-right'
            }),
            
            // Save Dialog with progress feedback
            React.createElement(SaveDialog, {
                open: isSaveDialogOpen,
                onClose: () => setIsSaveDialogOpen(false),
                onSave: handleSaveDialogSubmit,
                initialValues: {
                    name: currentRoute?._loadedState?.name || currentRoute?.name || 'Untitled Route',
                    type: currentRoute?._loadedState?.type || currentRoute?.type || 'tourism',
                    isPublic: true,
                    eventDate: currentRoute?._loadedState?.eventDate || currentRoute?.eventDate
                },
                isEditing: !!currentLoadedPersistentId,
                isSaving: isUploading,
                progress: uploadProgress
            })
        ])
    );
}

export default function MapView() {
    console.log('[MapView] Creating MapView component with provider structure: MapOverviewProvider → RouteProvider → LineProvider → MapViewContent');
    return React.createElement(MapOverviewProvider, { 
        children: React.createElement(RouteProvider, {
            children: React.createElement(LineProvider, {
                children: React.createElement(MapViewContent, {})
            })
        })
    });
}
