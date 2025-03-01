import { useRef, useEffect, useState, useMemo } from 'react';
import { usePresentationRouteInit } from '../../hooks/usePresentationRouteInit';
import mapboxgl from 'mapbox-gl';
import SearchControl from '../SearchControl/SearchControl';
import { Feature, LineString } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import StyleControl, { MAP_STYLES } from '../StyleControl';
import { useRouteContext } from '../../../map/context/RouteContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import { RouteLayer } from '../../../map/components/RouteLayer';
import { PresentationSidebar } from '../PresentationSidebar';
import { PresentationElevationProfilePanel } from '../ElevationProfile/PresentationElevationProfilePanel';
import { PresentationPOILayer } from '../POILayer/PresentationPOILayer';
import { PresentationPhotoLayer } from '../PhotoLayer/PresentationPhotoLayer';
import { PresentationDistanceMarkers } from '../DistanceMarkers/PresentationDistanceMarkers';
import { MapProvider } from '../../../map/context/MapContext';
import './PresentationMapView.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function PresentationMapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const { currentRoute, routes, currentLoadedState } = useRouteContext();
  const [hoverCoordinates, setHoverCoordinates] = useState<[number, number] | null>(null);

  // Initialize routes using our presentation-specific hook
  const { initialized: routesInitialized } = usePresentationRouteInit({
    routes,
    onInitialized: () => {
      console.log('[PresentationMapView] Routes initialized');
    }
  });

  // Store previous route reference
  const previousRouteRef = useRef<string | null>(null);

  // Update map state when route changes
  useEffect(() => {
    if (!isMapReady || !mapInstance.current || !currentRoute?.geojson) return;

    console.log('[PresentationMapView] Handling route change:', {
      routeId: currentRoute.routeId,
      geojsonType: currentRoute.geojson.type,
      featureCount: currentRoute.geojson.features?.length,
      isPreviousRoute: previousRouteRef.current !== null
    });

    // Get route bounds
    if (currentRoute.geojson?.features?.[0]?.geometry?.type === 'LineString') {
      const feature = currentRoute.geojson.features[0] as Feature<LineString>;
      const coordinates = feature.geometry.coordinates;
      
      if (coordinates && coordinates.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach((coord) => {
          if (coord.length >= 2) {
            bounds.extend([coord[0], coord[1]]);
          }
        });

        // Find the middle coordinate of the route
        const middleIndex = Math.floor(coordinates.length / 2);
        const middleCoord = coordinates[middleIndex];

        if (!previousRouteRef.current) {
          // For the first route, fit bounds to set initial zoom
          mapInstance.current.fitBounds(bounds, {
            padding: 50,
            duration: 1500
          });
        } else {
          // For subsequent routes, pan to middle coordinate maintaining zoom
          mapInstance.current.easeTo({
            center: [middleCoord[0], middleCoord[1]],
            zoom: mapInstance.current.getZoom(),
            duration: 1500,
            essential: true
          });
        }

        // Update previous route reference
        previousRouteRef.current = currentRoute.routeId || null;
      }
    }
  }, [isMapReady, currentRoute]);

    // Initialize map
    useEffect(() => {
      if (!mapRef.current) return;
  
      console.log('[PresentationMapView] Initializing map...');
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: MAP_STYLES.satellite.url,
        bounds: [[144.5, -43.7], [148.5, -40.5]], // Tasmania bounds
        fitBoundsOptions: {
          padding: 0,
          pitch: 0,
          bearing: 0
        },
        projection: 'globe',
        maxPitch: 85
      });
  
      // Log map initialization events
      map.on('load', () => {
        console.log('[PresentationMapView] Map loaded');

        // Add terrain synchronously
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        });
        
        map.setTerrain({ 
          source: 'mapbox-dem', 
          exaggeration: 1.5
        });

        setIsMapReady(true);
      });
  
      map.on('style.load', () => {
        console.log('[PresentationMapView] Style loaded');
      });

      map.on('zoom', () => {
        const zoom = map.getZoom();
        console.log('[PresentationMapView] Zoom changed:', zoom, 'Floor:', Math.floor(zoom));
      });
  
      map.on('error', (e) => {
        console.error('[PresentationMapView] Map error:', e);
      });
      
    // Add mousemove event to set hover coordinates
    map.on('mousemove', (e) => {
      // Get mouse coordinates
      const mouseCoords = [e.lngLat.lng, e.lngLat.lat];
      console.log('[PresentationMapView] Mouse move:', mouseCoords);
      
      // Get all route sources directly from the map
      const style = map.getStyle();
      if (!style || !style.sources) {
        console.log('[PresentationMapView] No style or sources available');
        return;
      }
      
      // Find all sources that might contain route data
      let routeSources = Object.entries(style.sources)
        .filter(([id, source]) => {
          if (id.includes('-main') && source.type === 'geojson') {
            const geoJsonSource = source as mapboxgl.GeoJSONSourceSpecification;
            if (typeof geoJsonSource.data === 'object' && 
                geoJsonSource.data !== null && 
                'features' in geoJsonSource.data && 
                Array.isArray(geoJsonSource.data.features) && 
                geoJsonSource.data.features.length > 0 &&
                geoJsonSource.data.features[0].geometry?.type === 'LineString') {
              return true;
            }
          }
          return false;
        });
      
      console.log('[PresentationMapView] Found route sources:', routeSources.map(([id]) => id));
      
      // Try to find the active route
      let activeRouteSource: mapboxgl.GeoJSONSourceSpecification | null = null;
      
      // Use the current route from context
      if (currentRoute) {
        const routeId = currentRoute.routeId || `route-${currentRoute.id}`;
        const sourceId = `${routeId}-main`;
        
        console.log('[PresentationMapView] Looking for source ID:', sourceId);
        
        // Find this source in our routeSources
        const foundSource = routeSources.find(([id]) => id === sourceId);
        if (foundSource) {
          console.log('[PresentationMapView] Found active route source:', sourceId);
          activeRouteSource = foundSource[1] as mapboxgl.GeoJSONSourceSpecification;
        } else {
          console.log('[PresentationMapView] Active route source not found');
        }
      } else if (routeSources.length > 0) {
        // Fallback to first route if no current route
        console.log('[PresentationMapView] No current route, using first route source');
        activeRouteSource = routeSources[0][1] as mapboxgl.GeoJSONSourceSpecification;
      }
      
      // If we don't have an active route, clear any marker and return
      if (!activeRouteSource) {
        console.log('[PresentationMapView] No active route source found');
        if (hoverCoordinates) {
          setHoverCoordinates(null);
        }
        return;
      }
      
      // Get coordinates from the active route
      const geoJsonData = activeRouteSource.data as GeoJSON.FeatureCollection<GeoJSON.LineString>;
      const coordinates = geoJsonData.features[0].geometry.coordinates;
      
      console.log('[PresentationMapView] Route has', coordinates.length, 'coordinates');
      
      // Find the closest point on the active route
      let closestPoint: [number, number] | null = null;
      let minDistance = Infinity;
      
      // Check all coordinates in the active route
      coordinates.forEach((coord) => {
        if (coord.length >= 2) {
          const dx = coord[0] - mouseCoords[0];
          const dy = coord[1] - mouseCoords[1];
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = [coord[0], coord[1]];
          }
        }
      });
      
      console.log('[PresentationMapView] Closest point:', closestPoint, 'with distance:', minDistance);
      
      // Define a threshold distance - only show marker when close to the route
      const distanceThreshold = 0.005; // Approximately 500m at the equator
      
      // If we found a closest point on the active route and it's within the threshold
      if (closestPoint && minDistance < distanceThreshold) {
        console.log('[PresentationMapView] Setting hover coordinates:', closestPoint);
        setHoverCoordinates(closestPoint);
      } else {
        // If no point found or too far from route, clear the marker
        if (hoverCoordinates) {
          console.log('[PresentationMapView] Clearing hover coordinates');
          setHoverCoordinates(null);
        }
      }
    });

    // Add Mapbox controls first
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

    // Add custom controls after
    map.addControl(new SearchControl(), 'top-right');
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
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      document.head.removeChild(style);
    };
  }, []);

  const mapContextValue = useMemo(() => {
    console.log('[PresentationMapView] Creating map context with hoverCoordinates:', hoverCoordinates);
    return {
      map: mapInstance.current,
      dragPreview: null,
      setDragPreview: () => {},
      isMapReady,
      isInitializing: false,
      hoverCoordinates,
      setHoverCoordinates,
      onPoiPlacementClick: undefined,
      setPoiPlacementClick: () => {},
      poiPlacementMode: false,
      setPoiPlacementMode: () => {}
    };
  }, [isMapReady, hoverCoordinates]);

  return (
    <MapProvider value={mapContextValue}>
      <div className="w-full h-full relative">
        <div 
          ref={mapRef}
          style={{ width: 'calc(100vw - 56px)', height: '100vh', position: 'fixed', top: 0, left: '56px' }}
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
              flexDirection: 'column',
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

        <PresentationSidebar isOpen={true} />
        {isMapReady && mapInstance.current && (
          <>
            {/* Render RouteLayer for each route */}
            {routes.map(route => (
              <RouteLayer 
                key={route.routeId}
                map={mapInstance.current!} 
                route={route} 
              />
            ))}

            {/* Render POIs and Photos */}
            <PresentationPOILayer map={mapInstance.current} />
            <PresentationPhotoLayer />
            
            {currentRoute && (
              <>
                <PresentationDistanceMarkers map={mapInstance.current} route={currentRoute} />
                <div className="route-filename">
                  The Lutruwita Way
                </div>
              </>
            )}
            {currentRoute && (
              <div className="elevation-container">
                <PresentationElevationProfilePanel route={currentRoute} />
              </div>
            )}
          </>
        )}
      </div>
    </MapProvider>
  );
}
