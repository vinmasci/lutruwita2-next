import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '../../../../lib/mapbox-gl-no-indoor';
import TracerLayer from './TracerLayer';
import logger from '../../../../utils/logger';

/**
 * TracerLayerTest - A simple component to test the WebGL tracer layer
 * This component creates a map and adds the TracerLayer to it.
 * It also adds controls to test updating the tracer coordinates.
 */
const TracerLayerTest = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tracerLayerRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [coordinates, setCoordinates] = useState(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [146.5, -42.0], // Tasmania
      zoom: 8,
      accessToken: import.meta.env.VITE_MAPBOX_TOKEN
    });

    // Save map instance
    mapRef.current = map;

    // Set up map load handler
    map.on('load', () => {
      logger.info('TracerLayerTest', 'Map loaded');

      // Create and add the WebGL tracer layer
      const tracerLayer = new TracerLayer();
      map.addLayer(tracerLayer);
      tracerLayerRef.current = tracerLayer;

      // Set map as ready
      setIsMapReady(true);
    });

    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update tracer coordinates when they change
  useEffect(() => {
    if (!isMapReady || !tracerLayerRef.current) return;

    tracerLayerRef.current.updateCoordinates(coordinates);
  }, [coordinates, isMapReady]);

  // Handle map click to set tracer coordinates
  const handleMapClick = (e) => {
    if (!mapRef.current) return;

    const { lng, lat } = e.lngLat;
    setCoordinates([lng, lat]);
    logger.info('TracerLayerTest', `Set tracer coordinates to [${lng}, ${lat}]`);
  };

  // Add click handler when map is ready
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    mapRef.current.on('click', handleMapClick);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
    };
  }, [isMapReady]);

  // Handle clear button click
  const handleClearClick = () => {
    setCoordinates(null);
    logger.info('TracerLayerTest', 'Cleared tracer coordinates');
  };

  // Handle random button click
  const handleRandomClick = () => {
    // Generate random coordinates within Tasmania
    const lng = 145.0 + Math.random() * 3.0;
    const lat = -43.0 + Math.random() * 2.0;
    setCoordinates([lng, lat]);
    logger.info('TracerLayerTest', `Set tracer coordinates to random [${lng}, ${lat}]`);
  };

  return (
    <div className="tracer-layer-test">
      <h2>WebGL Tracer Layer Test</h2>
      <div className="test-controls">
        <button onClick={handleClearClick}>Clear Tracer</button>
        <button onClick={handleRandomClick}>Random Position</button>
        <div className="coordinates">
          {coordinates ? `Coordinates: [${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}]` : 'No coordinates set'}
        </div>
      </div>
      <div 
        ref={mapContainerRef} 
        className="map-container" 
        style={{ width: '100%', height: '500px' }}
      />
      <div className="instructions">
        <p>Click on the map to set the tracer position.</p>
        <p>Use the buttons above to clear the tracer or set a random position.</p>
      </div>
    </div>
  );
};

export default TracerLayerTest;
