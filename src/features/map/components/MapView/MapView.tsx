import { useRef, useEffect, useState, useCallback, lazy, Suspense } from 'react';
import mapboxgl from 'mapbox-gl';
import { DistanceMarkers } from '../DistanceMarkers/DistanceMarkers';
import StyleControl, { MAP_STYLES } from '../StyleControl/StyleControl';
import SearchControl from '../SearchControl/SearchControl';
import { ElevationProfilePanel } from '../../../gpx/components/ElevationProfile/ElevationProfilePanel';
import { MapProvider } from '../../context/MapContext';
import { RouteProvider, useRouteContext } from '../../context/RouteContext';
import { POIProvider, usePOIContext } from '../../../poi/context/POIContext';
import { usePhotoContext, PhotoProvider } from '../../../photo/context/PhotoContext';
import { PlaceProvider } from '../../../place/context/PlaceContext';
import { PhotoLayer } from '../../../photo/components/PhotoLayer/PhotoLayer';
import { POIType, POIPosition, POICategory, POIIconName } from '../../../poi/types/poi.types';
import { POIViewer } from '../../../poi/components/POIViewer/POIViewer';
import { getIconDefinition } from '../../../poi/constants/poi-icons';
import POIDetailsDrawer from '../../../poi/components/POIDetailsDrawer/POIDetailsDrawer';
import MapboxPOIMarker from '../../../poi/components/MapboxPOIMarker';
import POIDragPreview from '../../../poi/components/POIDragPreview/POIDragPreview';
import PlacePOILayer from '../../../poi/components/PlacePOILayer/PlacePOILayer';
import '../../../poi/components/PlacePOILayer/PlacePOILayer.css';
import './MapView.css';
import { Sidebar } from '../Sidebar';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useClientGpxProcessing } from '../../../gpx/hooks/useClientGpxProcessing';
import { Feature, LineString } from 'geojson';
import { ProcessedRoute, UnpavedSection } from '../../types/route.types';
import { addSurfaceOverlay } from '../../../gpx/services/surfaceService';
import { RouteLayer } from '../RouteLayer';
import { normalizeRoute } from '../../utils/routeUtils';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Debug function for road layer
const debugRoadLayer = (map: mapboxgl.Map) => {
  console.log('[DEBUG] Checking road layer...');
  
  // Log all available layers
  const style = map.getStyle();
  const allLayers = style?.layers || [];
  console.log('[DEBUG] All layers:', allLayers.map(l => ({
    id: l.id,
    type: l.type,
    source: l['source'],
    'source-layer': l['source-layer']
  })));

  // Check our specific layer
  const roadLayer = map.getLayer('custom-roads');
  console.log('[DEBUG] Road layer:', roadLayer);

  // Try to get some features
  if (map.isStyleLoaded()) {
    const bounds = map.getBounds();
    if (!bounds) {
      console.log('[DEBUG] No bounds available');
      return;
    }
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    const features = map.queryRenderedFeatures(
      [
        map.project(sw),
        map.project(ne)
      ],
      {
        layers: ['custom-roads']
      }
    );
    
    console.log('[DEBUG] Found features:', features.length);
    if (features.length > 0) {
      console.log('[DEBUG] Sample feature:', {
        properties: features[0].properties,
        geometry: features[0].geometry
      });
    }
  }
};

function MapViewContent() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [streetsLayersLoaded, setStreetsLayersLoaded] = useState(false);
  const { pois, updatePOIPosition, addPOI, updatePOI } = usePOIContext();
  const [mapReady, setMapReady] = useState(false);
  const [isGpxDrawerOpen, setIsGpxDrawerOpen] = useState(false);
  const currentRouteId = useRef<string | null>(null);
  const [hoverCoordinates, setHoverCoordinates] = useState<[number, number] | null>(null);
  const hoverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const { processGpx } = useClientGpxProcessing();
  const { addRoute, deleteRoute, setCurrentRoute, currentRoute, routes } = useRouteContext();

  // Function to add route click handler
  const addRouteClickHandler = useCallback((map: mapboxgl.Map, routeId: string) => {
    const mainLayerId = `${routeId}-main-line`;
    
    // Create click handler
    const clickHandler = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      console.log('[MapView] Route layer clicked:', mainLayerId);
      const route = routes.find((r: ProcessedRoute) => r.routeId === routeId);
      if (route) {
        console.log('[MapView] Found matching route:', route.routeId);
        setCurrentRoute(route);
      } else {
        console.log('[MapView] No matching route found for ID:', routeId);
      }
    };
    // Remove existing handler if any
    map.off('click', mainLayerId, clickHandler);
    
    // Add new click handler
    map.on('click', mainLayerId, clickHandler);
  }, [routes, setCurrentRoute]);

  // Effect to add click handlers for existing routes when map loads
  useEffect(() => {
    if (!mapInstance.current || !isMapReady) return;
    
    const map = mapInstance.current;
    console.log('[MapView] Adding click handlers for routes:', routes);
    routes.forEach(route => {
      const routeId = route.routeId || `route-${route.id}`;
      console.log('[MapView] Checking for route layer:', `${routeId}-main-line`);
      if (map.getLayer(`${routeId}-main-line`)) {
        console.log('[MapView] Adding click handler for route:', routeId);
        addRouteClickHandler(map, routeId);
      }
    });
  }, [isMapReady, routes, addRouteClickHandler]);

  // Update hover marker when coordinates change
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove existing marker
    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.remove();
      hoverMarkerRef.current = null;
    }

    // Add new marker if we have coordinates
    if (hoverCoordinates) {
      const el = document.createElement('div');
      el.className = 'hover-marker';
      el.style.width = '6px';
      el.style.height = '6px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#ee5253';
      el.style.border = '2px solid white';

      hoverMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat(hoverCoordinates)
        .addTo(mapInstance.current);
    }
  }, [hoverCoordinates]);

  // Reusable function to render a route on the map
  const renderRouteOnMap = useCallback(async (route: ProcessedRoute) => {
    if (!mapInstance.current || !isMapReady) {
      console.error('Map is not ready');
      return;
    }

    const map = mapInstance.current;
    const routeId = route.routeId || `route-${route.id}`;
    console.log('[MapView] Rendering route:', routeId);

    const mainLayerId = `${routeId}-main-line`;
    const borderLayerId = `${routeId}-main-border`;
    const mainSourceId = `${routeId}-main`;

    // Clean up existing layers
    if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
    if (map.getLayer(mainLayerId)) map.removeLayer(mainLayerId);
    if (map.getSource(mainSourceId)) map.removeSource(mainSourceId);

    // Add the main route source and layers
    map.addSource(mainSourceId, {
      type: 'geojson',
      data: route.geojson,
      generateId: true,
      tolerance: 0.5
    });

    // Add main route layers
    map.addLayer({
      id: borderLayerId,
      type: 'line',
      source: mainSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            visibility: 'visible'
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 5,
            'line-opacity': 1
          }
    });

    map.addLayer({
      id: mainLayerId,
      type: 'line',
      source: mainSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            visibility: 'visible'
          },
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              '#ff8f8f',
              '#ee5253'
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              5,
              3
            ],
            'line-opacity': 1
          }
    });

    // Handle surface data based on route type
    if (route._type === 'fresh' && (!route.unpavedSections || route.unpavedSections.length === 0)) {
      const feature = route.geojson.features[0] as Feature<LineString>;
      try {
        const featureWithRouteId = {
          ...feature,
          properties: {
            ...feature.properties,
            routeId: routeId
          }
        };
        // Detect and save unpaved sections
        const sections = await addSurfaceOverlay(map, featureWithRouteId);
        // Update route with unpaved sections
        route.unpavedSections = sections.map(section => ({
          startIndex: section.startIndex,
          endIndex: section.endIndex,
          coordinates: section.coordinates,
          surfaceType: section.surfaceType === 'unpaved' ? 'unpaved' :
                      section.surfaceType === 'gravel' ? 'gravel' : 'trail'
        }));
      } catch (error) {
        console.error('[MapView] Surface detection error:', error);
      }
    } else {
      // For loaded routes or routes with existing sections, render them
      route.unpavedSections?.forEach((section, index) => {
        const sourceId = `unpaved-section-${routeId}-${index}`;
        const layerId = `unpaved-section-layer-${routeId}-${index}`;

        // Clean up existing
        if (map.getSource(sourceId)) {
          map.removeLayer(layerId);
          map.removeSource(sourceId);
        }

        // Add source with surface property
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              surface: section.surfaceType
            },
            geometry: {
              type: 'LineString',
              coordinates: section.coordinates
            }
          }
        });

        // Add white dashed line for unpaved segments
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-dasharray': [1, 3]
          }
        });
      });
    }

    // Add click handler
    addRouteClickHandler(map, routeId);

    // Get coordinates from the GeoJSON
    const feature = route.geojson.features[0] as Feature<LineString>;

    // Wait briefly for layers to be ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Fit bounds to show the route
    const bounds = new mapboxgl.LngLatBounds();
    feature.geometry.coordinates.forEach((coord) => {
      if (coord.length >= 2) {
        bounds.extend([coord[0], coord[1]]);
      }
    });
    
    map.fitBounds(bounds, { 
      padding: 50,
      maxZoom: 13,
      minZoom: 13
    });
  }, [isMapReady, addRouteClickHandler]);

  // Effect to render current route when it changes
  useEffect(() => {
    if (!currentRoute || !mapInstance.current || !isMapReady) return;

    console.log('[MapView] Current route changed:', currentRoute.id);

    // For new routes (GPX uploads), use renderRouteOnMap
    if (currentRoute._type === 'fresh') {
      renderRouteOnMap(currentRoute).catch(error => {
        console.error('[MapView] Error rendering route:', error);
      });
    }
    // For loaded routes (from MongoDB), RouteLayer component handles rendering
  }, [currentRoute, isMapReady, renderRouteOnMap]);

  const handleUploadGpx = async (file?: File, processedRoute?: ProcessedRoute) => {
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

      setIsGpxDrawerOpen(false);
    } catch (error) {
      console.error('[MapView] Error processing GPX:', error);
    }
  };

  const [isPOIDrawerOpen, setIsPOIDrawerOpen] = useState(false);
  const [dragPreview, setDragPreview] = useState<{
    icon: POIIconName;
    category: POICategory;
  } | null>(null);
  const [isPoiPlacementMode, setPoiPlacementMode] = useState(false);
  const [onPoiPlacementClick, setPoiPlacementClick] = useState<((coords: [number, number]) => void) | undefined>(undefined);

  // Update cursor style and click handler when in POI placement mode
  useEffect(() => {
    if (!mapInstance.current || !isMapReady) return;
    
    const map = mapInstance.current;
    const canvas = map.getCanvas();
    if (!canvas) return;

    canvas.style.cursor = isPoiPlacementMode ? 'crosshair' : '';

    if (isPoiPlacementMode) {
      const clickHandler = (e: mapboxgl.MapMouseEvent) => {
        console.log('[MapView] Map clicked:', e.lngLat);
        console.log('[MapView] onPoiPlacementClick handler exists:', !!onPoiPlacementClick);
        
        if (onPoiPlacementClick) {
          const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          console.log('[MapView] Calling onPoiPlacementClick with coords:', coords);
          onPoiPlacementClick(coords);
        }
      };

      map.on('click', clickHandler);
      
      return () => {
        map.off('click', clickHandler);
        canvas.style.cursor = '';
      };
    }
  }, [isPoiPlacementMode, onPoiPlacementClick, isMapReady]);

  const handleAddPOI = () => {
    const newIsOpen = !isPOIDrawerOpen;
    setIsPOIDrawerOpen(newIsOpen);
    setPoiPlacementMode(newIsOpen);
    if (!newIsOpen) {
      setPoiPlacementClick(undefined);
    }
  };

  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedPOIDetails, setSelectedPOIDetails] = useState<{
    iconName: POIIconName;
    category: POICategory;
    position: POIPosition;
  } | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POIType | null>(null);

  const handlePOIClick = (poi: POIType) => {
    setSelectedPOI(poi);
  };

  const handlePOICreation = (icon: POIIconName, category: POICategory, position: POIPosition) => {
    setSelectedPOIDetails({ iconName: icon, category, position });
    setDetailsDrawerOpen(true);
    setPoiPlacementMode(false);
    setIsPOIDrawerOpen(false);
  };

  const handlePOIDetailsSave = async (details: { name: string; description: string; photos: File[] }) => {
    if (!selectedPOIDetails) return;

    try {
      // Get current route ID
      const currentRouteId = currentRoute?.routeId || `route-${currentRoute?.id}`;
      
      // Create POI with all details
      const poiDetails = {
        type: 'draggable' as const,
        position: selectedPOIDetails.position,
        name: details.name,
        description: details.description,
        category: selectedPOIDetails.category,
        icon: selectedPOIDetails.iconName,
      };

      console.log('[POI_DETAILS_FOR_MONGODB]', JSON.stringify(poiDetails, null, 2));
      addPOI(poiDetails);

      // Clear temporary marker and close drawer
      setSelectedPOIDetails(null);
      setDetailsDrawerOpen(false);
    } catch (error) {
      console.error('Error saving POI:', error);
    }
  };

  const handleDeleteRoute = (routeId: string) => {
    if (!mapInstance.current) return;
    
    const map = mapInstance.current;

    // Clean up layers and sources for both new and loaded routes
    const layersToRemove = [
      `${routeId}-main-border`,
      `${routeId}-main-line`,
      `${routeId}-surface`,
      `${routeId}-unpaved-line`
    ];

    // Remove layers
    layersToRemove.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });

    // Remove sources
    const sourcesToRemove = [
      `${routeId}-main`,
      `${routeId}-unpaved`
    ];

    sourcesToRemove.forEach(sourceId => {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    // Clean up any remaining unpaved section layers and sources from old routes
    const style = map.getStyle();
    if (style?.layers) {
      const layerIds = style.layers.map(layer => layer.id);
      layerIds.forEach(layerId => {
        if (layerId.startsWith(`unpaved-section-layer-${routeId}-`)) {
          map.removeLayer(layerId);
          const sectionIndex = layerId.split('-').pop();
          const sourceId = `unpaved-section-${routeId}-${sectionIndex}`;
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
        }
      });
    }

    // Delete from context (this will also clear current route if needed)
    deleteRoute(routeId);
    
    // Clear local reference
    if (currentRouteId.current === routeId) {
      currentRouteId.current = null;
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: MAP_STYLES.satellite.url,
      bounds: [[144.5, -43.7], [148.5, -40.5]], // Tasmania bounds
      fitBoundsOptions: {
        padding: 0,
        pitch: 45,
        bearing: 0
      },
      projection: 'globe',
      maxPitch: 85
    });

    // Add terrain
    map.on('load', () => {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });
      
      // Set terrain configuration
      map.setTerrain({ 
        source: 'mapbox-dem', 
        exaggeration: 1.5
      });

      // Add event listeners for marker orientation
      map.on('pitch', () => {
        const markers = document.querySelectorAll('.marker-container');
        markers.forEach(marker => {
          const el = marker as HTMLElement;
          el.style.transform = `rotate(${-map.getPitch()}deg)`;
        });
      });

      map.on('rotate', () => {
        const markers = document.querySelectorAll('.marker-container');
        markers.forEach(marker => {
          const el = marker as HTMLElement;
          el.style.transform = `rotate(${-map.getBearing()}deg)`;
        });
      });

      // Add custom roads layer
      const tileUrl = 'https://api.maptiler.com/tiles/5dd3666f-1ce4-4df6-9146-eda62a200bcb/{z}/{x}/{y}.pbf?key=DFSAZFJXzvprKbxHrHXv';
      map.addSource('australia-roads', {
        type: 'vector',
        tiles: [tileUrl],
        minzoom: 12,
        maxzoom: 14
      });

      map.addLayer({
        id: 'custom-roads',
        type: 'line',
        source: 'australia-roads',
        'source-layer': 'lutruwita',
        minzoom: 12,
        maxzoom: 14,
        paint: {
          'line-opacity': 1,
          'line-color': [
            'match',
            ['get', 'surface'],
            ['paved', 'asphalt', 'concrete', 'compacted', 'sealed', 'bitumen', 'tar'],
            '#4A90E2',
            ['unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth'],
            '#D35400',
            '#888888'
          ],
          'line-width': 2
        }
      });

      // Add debug call after layer is added
      map.once('idle', () => {
        debugRoadLayer(map);
      });

      setStreetsLayersLoaded(true);
      setIsMapReady(true);
      setMapReady(true);
    });

    // Add controls
    map.addControl(new SearchControl(), 'top-right');
    map.addControl(new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    }), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    // Add style control last so it appears at bottom
    map.addControl(new StyleControl(), 'top-right');

    // Style controls
    const style = document.createElement('style');
    style.textContent = `
      .mapboxgl-ctrl-group {
        background-color: rgba(35, 35, 35, 0.9) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      .mapboxgl-ctrl-group button {
        width: 36px !important;
        height: 36px !important;
      }
      .mapboxgl-ctrl-icon {
        filter: invert(1);
      }
      .mapboxgl-ctrl-geolocate {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    `;
    document.head.appendChild(style);

    mapInstance.current = map;

    return () => {
      map.remove();
      document.head.removeChild(style);
    };
  }, []);

  // Handle POI drag end
  const handlePOIDragEnd = useCallback((poi: POIType, newPosition: POIPosition) => {
    updatePOIPosition(poi.id, newPosition);
  }, [updatePOIPosition]);

  return (
    <MapProvider value={{ 
      map: mapInstance.current, 
      isMapReady,
      isInitializing,
      hoverCoordinates,
      setHoverCoordinates,
      isPoiPlacementMode,
      setPoiPlacementMode,
      onPoiPlacementClick,
      setPoiPlacementClick,
      dragPreview,
      setDragPreview
    }}>
      <div className="w-full h-full relative">
        <div 
          ref={mapRef}
          style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}
        />
        
        {!isMapReady && (
          <Box
            sx={{
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
            }}
          >
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" color="white">
              Loading map...
            </Typography>
          </Box>
        )}

        <Sidebar
          onUploadGpx={handleUploadGpx}
          onAddPhotos={() => {}}
          onAddPOI={handleAddPOI}
          mapReady={mapReady}
          onItemClick={() => {}}
          onToggleRoute={() => {}}
          onToggleGradient={() => {}}
          onToggleSurface={() => {}}
          onPlacePOI={() => {}}
          onDeleteRoute={handleDeleteRoute}
        />

        {isMapReady && (
          <>
            <PhotoLayer />
            <PlacePOILayer />
            {pois.filter(poi => poi.type === 'draggable').map(poi => (
              <MapboxPOIMarker
                key={poi.id}
                poi={poi}
                onDragEnd={handlePOIDragEnd}
                onClick={() => handlePOIClick(poi)}
              />
            ))}
          </>
        )}

        {dragPreview && (
          <POIDragPreview
            icon={dragPreview.icon}
            category={dragPreview.category}
            onPlace={(position) => {
              handlePOICreation(dragPreview.icon, dragPreview.category, position);
              setDragPreview(null);
            }}
          />
        )}

        {selectedPOIDetails && (
          <MapboxPOIMarker
            poi={{
              id: 'temp-poi',
              type: 'draggable',
              position: selectedPOIDetails.position,
              name: getIconDefinition(selectedPOIDetails.iconName)?.label || '',
              category: selectedPOIDetails.category,
              icon: selectedPOIDetails.iconName
            }}
          />
        )}

        {currentRoute && isMapReady && mapInstance.current && (
          <>
            {/* For loaded routes, use the RouteLayer */}
            {currentRoute._type === 'loaded' && (
              <RouteLayer 
                map={mapInstance.current} 
                route={currentRoute} 
              />
            )}
            
            <ElevationProfilePanel route={currentRoute} />
            <DistanceMarkers map={mapInstance.current} />
          </>
        )}

        {selectedPOIDetails && (
          <POIDetailsDrawer
            isOpen={detailsDrawerOpen}
            onClose={() => {
              setDetailsDrawerOpen(false);
              setSelectedPOIDetails(null);
              setPoiPlacementMode(false);
              setIsPOIDrawerOpen(false);
            }}
            iconName={selectedPOIDetails.iconName}
            category={selectedPOIDetails.category}
            onSave={handlePOIDetailsSave}
          />
        )}

        {selectedPOI && (
          <POIViewer
            poi={selectedPOI}
            onClose={() => setSelectedPOI(null)}
            onUpdate={updatePOI}
          />
        )}
      </div>
    </MapProvider>
  );
}

export default function MapView() {
  return (
    <RouteProvider>
      <MapViewContent />
    </RouteProvider>
  );
}
