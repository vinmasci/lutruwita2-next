import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Feature, LineString } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAP_STYLES } from '../../../map/components/StyleControl/StyleControl';
import { useMapContext } from '../../../map/context/MapContext';
import { useRouteContext } from '../../../map/context/RouteContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import { RouteLayer } from '../../../map/components/RouteLayer';
import { PresentationSidebar } from '../PresentationSidebar';
import { PresentationElevationProfile } from '../ElevationProfile';
import { PresentationPOILayer } from '../POILayer/PresentationPOILayer';
import { PresentationPhotoLayer } from '../PhotoLayer/PresentationPhotoLayer';
import { PresentationDistanceMarkers } from '../DistanceMarkers/PresentationDistanceMarkers';
import './PresentationMapView.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function PresentationMapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isTerrainReady, setIsTerrainReady] = useState(false);
  const { currentRoute, routes } = useRouteContext();

  // Update map state when route changes
  useEffect(() => {
    if (!isMapReady || !isTerrainReady || !mapInstance.current || !currentRoute?.geojson) {
      console.log('[PresentationMapView] Waiting for map/terrain/route:', {
        isMapReady,
        isTerrainReady,
        hasMap: !!mapInstance.current,
        hasRoute: !!currentRoute,
        hasGeojson: currentRoute?.geojson != null
      });
      return;
    }

    console.log('[PresentationMapView] Fitting bounds to route:', {
      routeId: currentRoute.routeId,
      geojsonType: currentRoute.geojson.type,
      featureCount: currentRoute.geojson.features?.length
    });

    // Fit bounds to route
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

        mapInstance.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 13,
          duration: 0 // Instant transition
        });
      }
    }
  }, [isMapReady, isTerrainReady, currentRoute]);
  
  console.log('[PresentationMapView] Current route:', currentRoute);
  console.log('[PresentationMapView] All routes:', routes);

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
        pitch: 45,
        bearing: 0
      },
      projection: 'globe',
      maxPitch: 85
    });

    // Log map initialization events
    map.on('load', () => {
      console.log('[PresentationMapView] Map loaded');
      setIsMapReady(true);

      // Add terrain after map loads
      console.log('[PresentationMapView] Adding terrain...');
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

      // Wait for terrain to be ready
      map.once('idle', () => {
        console.log('[PresentationMapView] Terrain ready');
        setIsTerrainReady(true);
      });
    });

    map.on('style.load', () => {
      console.log('[PresentationMapView] Style loaded');
    });

    map.on('error', (e) => {
      console.error('[PresentationMapView] Map error:', e);
    });

    // Add navigation control
    map.addControl(new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    }), 'top-right');

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
      <div className="w-full h-full relative">
        <div 
          ref={mapRef}
          style={{ width: 'calc(100vw - 56px)', height: '100vh', position: 'fixed', top: 0, left: '56px' }}
        />
        
        {(!isMapReady || !isTerrainReady) && (
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
              {!isMapReady ? 'Loading map...' : 'Loading terrain...'}
            </Typography>
          </Box>
        )}

        <PresentationSidebar isOpen={true} />
        <Box sx={{ ml: '56px', position: 'relative', height: '100%', width: 'calc(100% - 56px)' }}>
          {isMapReady && isTerrainReady && mapInstance.current && (
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
              <PresentationPhotoLayer map={mapInstance.current} />
              
              {currentRoute && (
                <>
                  <PresentationDistanceMarkers map={mapInstance.current} route={currentRoute} />
                  <div className="route-filename">
                    {currentRoute.name || 'Untitled Route'}
                  </div>
                  <PresentationElevationProfile route={currentRoute} />
                </>
              )}
            </>
          )}
        </Box>
      </div>
  );
}
