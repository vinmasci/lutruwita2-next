import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapProvider } from '../../context/MapContext';
import { Sidebar } from '../Sidebar';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useClientGpxProcessing } from '../../../gpx/hooks/useClientGpxProcessing';
import { Feature, LineString } from 'geojson';
import { UnpavedSection, detectUnpavedSections } from '../../../gpx/services/surfaceService';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [streetsLayersLoaded, setStreetsLayersLoaded] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState([]);
  const [currentPOIs, setCurrentPOIs] = useState([]);
  const [activeRoute, setActiveRoute] = useState<{surfaces: string[]} | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isGpxDrawerOpen, setIsGpxDrawerOpen] = useState(false);
  const [unpavedLayers, setUnpavedLayers] = useState<string[]>([]);

  const { processGpx, isLoading } = useClientGpxProcessing();

  const clearUnpavedLayers = () => {
    if (!mapInstance.current) return;
    
    unpavedLayers.forEach(layerId => {
      if (mapInstance.current?.getLayer(layerId)) {
        mapInstance.current.removeLayer(layerId);
      }
      if (mapInstance.current?.getSource(layerId)) {
        mapInstance.current.removeSource(layerId);
      }
    });
    
    setUnpavedLayers([]);
  };

  const addUnpavedSections = async (coordinates: [number, number][]) => {
    if (!mapInstance.current) return;
    
    try {
      const sections = await detectUnpavedSections(coordinates);
      const map = mapInstance.current;
      
      // Clear existing unpaved layers
      clearUnpavedLayers();
      
      // Add new unpaved sections
      const newLayers: string[] = [];
      
      sections.forEach((section, index) => {
        const layerId = `unpaved-${index}-${Date.now()}`;
        newLayers.push(layerId);
        
        // Add source
        map.addSource(layerId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: section.coordinates
            }
          }
        });
        
        // Add layer
        map.addLayer({
          id: layerId,
          type: 'line',
          source: layerId,
          paint: {
            'line-color': '#f9ca24', // Yellow
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      });
      
      setUnpavedLayers(newLayers);
    } catch (error) {
      console.error('Error adding unpaved sections:', error);
    }
  };

  const handleUploadGpx = async (file?: File) => {
    if (!file) {
      setIsGpxDrawerOpen(true);
      return;
    }
    
    if (!mapInstance.current || !isMapReady) {
      console.error('Map is not ready');
      return;
    }

    try {
      const result = await processGpx(file);
      if (result) {
        // Add the route to the map
        const map = mapInstance.current;
        const routeId = `route-${Date.now()}`;

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
            'line-width': 7
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
            'line-color': '#ff4d4d',
            'line-width': 5
          }
        });

        // Get coordinates from the GeoJSON
        const feature = result.geojson.features[0] as Feature<LineString>;
        const coordinates = feature.geometry.coordinates as [number, number][];

        // Add unpaved sections
        await addUnpavedSections(coordinates);

        // Fit bounds to show the route
        const bounds = new mapboxgl.LngLatBounds();
        feature.geometry.coordinates.forEach((coord) => {
          if (coord.length >= 2) {
            bounds.extend([coord[0], coord[1]]);
          }
        });
        map.fitBounds(bounds, { padding: 50 });

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

  const handleAddPOI = () => {
    // TODO: Implement POI adding
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

  return (
    <MapProvider value={{ map: mapInstance.current }}>
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
          onAddPOI={handleAddPOI}
          mapReady={mapReady}
          onItemClick={() => {}}
          onToggleRoute={() => {}}
          onToggleGradient={() => {}}
          onToggleSurface={() => {}}
          onPlacePOI={() => {}}
        />
      </div>
    </MapProvider>
  );
}
