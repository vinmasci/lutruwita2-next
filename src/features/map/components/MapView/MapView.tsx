import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { ElevationProfilePanel } from '../../../gpx/components/ElevationProfile/ElevationProfilePanel';
import { MapProvider } from '../../context/MapContext';
import { RouteProvider, useRouteContext } from '../../context/RouteContext';
import { POIProvider, usePOIContext } from '../../../poi/context/POIContext';
import { POIType, POIPosition } from '../../../poi/types/poi.types';
import MapboxPOIMarker from '../../../poi/components/MapboxPOIMarker';
import './MapView.css';
import { Sidebar } from '../Sidebar';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useClientGpxProcessing } from '../../../gpx/hooks/useClientGpxProcessing';
import { Feature, LineString } from 'geojson';
import { ProcessedRoute } from '../../../gpx/types/gpx.types';
import { addSurfaceOverlay } from '../../../gpx/services/surfaceService';

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
  const [streetsLayersLoaded, setStreetsLayersLoaded] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState([]);
  const { pois, updatePOIPosition } = usePOIContext();
  const [activeRoute, setActiveRoute] = useState<{surfaces: string[]} | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isGpxDrawerOpen, setIsGpxDrawerOpen] = useState(false);
  const currentRouteId = useRef<string | null>(null);
  const [hoverCoordinates, setHoverCoordinates] = useState<[number, number] | null>(null);
  const hoverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const { processGpx, isLoading } = useClientGpxProcessing();
  const { addRoute, deleteRoute, setCurrentRoute, currentRoute } = useRouteContext();

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

  const handleUploadGpx = async (file?: File, processedRoute?: ProcessedRoute) => {
    console.log('[MapView] Starting upload at:', new Date().toISOString());
    
    if (!file && !processedRoute) {
      setIsGpxDrawerOpen(true);
      return;
    }
    
    if (!mapInstance.current || !isMapReady) {
      console.error('Map is not ready');
      return;
    }

    try {
      const result = processedRoute || (file ? await processGpx(file) : null);
      console.log('[MapView] Got result at:', new Date().toISOString());
      if (result) {
        addRoute(result);
        setCurrentRoute(result);
        
        // Add the route to the map
        const map = mapInstance.current;
        currentRouteId.current = result.routeId || `route-${result.id}`;
        const routeId = currentRouteId.current;
        console.log('[MapView] Adding route layers...');

        // Add the source
        map.addSource(routeId, {
          type: 'geojson',
          data: result.geojson
        });

        // Add single route layer with white border
        map.addLayer({
          id: `${routeId}-border`,
          type: 'line',
          source: routeId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': 5
          }
        });

        // Add main route layer
        map.addLayer({
          id: `${routeId}-line`,
          type: 'line',
          source: routeId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ee5253',
            'line-width': 3
          }
        });

        // Get coordinates from the GeoJSON
        const feature = result.geojson.features[0] as Feature<LineString>;
        const coordinates = feature.geometry.coordinates as [number, number][];

        // Wait briefly for layers to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try surface detection
        console.log('[MapView] Starting surface detection at:', new Date().toISOString());
        try {
          // Add routeId to feature properties for unique unpaved section IDs
          const featureWithRouteId = {
            ...feature,
            properties: {
              ...feature.properties,
              routeId: routeId
            }
          };
          await addSurfaceOverlay(map, featureWithRouteId);
        } catch (error) {
          console.error('[MapView] Surface detection error:', error);
        }

        // Fit bounds to show the route with zoom constraints
        const bounds = new mapboxgl.LngLatBounds();
        feature.geometry.coordinates.forEach((coord) => {
          if (coord.length >= 2) {
            bounds.extend([coord[0], coord[1]]);
          }
        });
        
        // Fit bounds and force zoom level 13
        map.fitBounds(bounds, { 
          padding: 50,
          maxZoom: 13,
          minZoom: 13  // Force zoom level 13
        });

        setIsGpxDrawerOpen(false);
      }
    } catch (error) {
      console.error('Error uploading GPX:', error);
      // Keep drawer open to show error state
    }
  };

  const handleGpxDrawerClose = () => {
    setIsGpxDrawerOpen(false);
  };

  const handleSaveMap = () => {
    // TODO: Implement map saving
  };

  const handleLoadMap = () => {
    // TODO: Implement map loading
  };

  const handleAddPhotos = () => {
    // TODO: Implement photo adding
  };

  const [isPOIDrawerOpen, setIsPOIDrawerOpen] = useState(false);
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
      const clickHandler = (e: mapboxgl.MapMouseEvent & { lngLat: mapboxgl.LngLat }) => {
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
    if (isPOIDrawerOpen) {
      // Clean up when drawer closes
      setIsPOIDrawerOpen(false);
      setPoiPlacementMode(false);
      setPoiPlacementClick(undefined);
    } else {
      setIsPOIDrawerOpen(true);
    }
  };

  const handleDeleteRoute = (routeId: string) => {
    if (!mapInstance.current) return;
    
    const map = mapInstance.current;

    // Remove main route layers
    if (map.getLayer(`${routeId}-border`)) {
      map.removeLayer(`${routeId}-border`);
    }
    if (map.getLayer(`${routeId}-line`)) {
      map.removeLayer(`${routeId}-line`);
    }
    if (map.getLayer(`${routeId}-surface`)) {
      map.removeLayer(`${routeId}-surface`);
    }

    // Remove main route source
    if (map.getSource(routeId)) {
      map.removeSource(routeId);
    }

    // Clean up unpaved section layers and sources
    const style = map.getStyle();
    if (!style || !style.layers) return;
    
    const layerIds = style.layers.map(layer => layer.id);
    
    // Find and remove all unpaved section layers and sources for this route
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
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      bounds: [[144.5, -43.7], [148.5, -40.5]], // Tasmania bounds
      fitBoundsOptions: {
        padding: 0,
        pitch: 45,
        bearing: 0
      }
    });

    // Add terrain
    map.on('load', () => {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

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
      hoverCoordinates,
      setHoverCoordinates,
      isPoiPlacementMode,
      setPoiPlacementMode,
      onPoiPlacementClick,
      setPoiPlacementClick
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
        onSaveMap={handleSaveMap}
        onLoadMap={handleLoadMap}
        onAddPhotos={handleAddPhotos}
        onAddPOI={() => {
          console.log('[MapView] onAddPOI called, current state:', {
            isPOIDrawerOpen,
            isPoiPlacementMode
          });
          setIsPOIDrawerOpen(!isPOIDrawerOpen);
        }}
        mapReady={mapReady}
        onItemClick={() => {}}
        onToggleRoute={() => {}}
        onToggleGradient={() => {}}
        onToggleSurface={() => {}}
        onPlacePOI={() => {}}
        onDeleteRoute={handleDeleteRoute}
      />
      {/* Render POI markers */}
      {isMapReady && pois.map(poi => (
        <MapboxPOIMarker
          key={poi.id}
          poi={poi}
          onDragEnd={handlePOIDragEnd}
        />
      ))}

      {currentRoute && (
        <ElevationProfilePanel
          route={currentRoute}
        />
      )}
    </div>
    </MapProvider>
  );
}

export default function MapView() {
  return (
    <RouteProvider>
      <POIProvider>
        <MapViewContent />
      </POIProvider>
    </RouteProvider>
  );
}
