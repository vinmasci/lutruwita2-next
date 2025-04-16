import React, { useState, useEffect, useMemo } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { usePOIContext } from '../../context/POIContext';
import MapboxPOIMarker from '../MapboxPOIMarker/MapboxPOIMarker';
import POICluster from '../POICluster/POICluster';
import { isCluster, getClusterExpansionZoom } from '../../utils/clustering';
import { clusterPOIsGeographically } from '../../utils/geographicClustering';

const DraggablePOILayer = ({ onPOIClick, onPOIDragEnd }) => {
  const { map } = useMapContext();
  const { pois } = usePOIContext();
  const [zoom, setZoom] = useState(null);
  const [clusteredItems, setClusteredItems] = useState([]);

  // Listen for zoom changes
  useEffect(() => {
    if (!map) return;

    const handleZoom = () => {
      setZoom(map.getZoom());
    };

    map.on('zoom', handleZoom);
    // Set initial zoom
    setZoom(map.getZoom());

    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map]);

  // Filter to only include draggable POIs
  const draggablePOIs = useMemo(() => {
    return pois.filter(poi => poi.type === 'draggable');
  }, [pois]);

  // Update clustering when POIs or zoom changes - using geographic clustering like in presentation mode
  useEffect(() => {
    if (!map || zoom === null) return;

    // Detect if device is mobile
    const isMobile = window.innerWidth <= 768;
    
    // Adjust distance threshold based on zoom level, exactly like in presentation mode
    let distanceThreshold;
    if (zoom < 8) {
      distanceThreshold = isMobile ? 1000 : 800; // Far zoom - large clusters
    } else if (zoom < 12) {
      distanceThreshold = isMobile ? 500 : 400; // Medium zoom - medium clusters
    } else if (zoom < 15) {
      distanceThreshold = isMobile ? 200 : 150; // Close zoom - small clusters
    } else {
      distanceThreshold = 0; // Very close zoom - no clustering
    }
    
    // Use geographic clustering with zoom-dependent distance threshold
    const clusters = clusterPOIsGeographically(draggablePOIs, {
      distanceThreshold,
      isMobile
    });
    
    setClusteredItems(clusters);
  }, [draggablePOIs, map, zoom]);

  // Handle cluster click - modified for geographic clusters like in presentation mode
  const handleClusterClick = (cluster) => {
    if (!map) return;
    
    // Get the cluster's coordinates
    const [lng, lat] = cluster.geometry.coordinates;
    
    // For geographic clusters, we use a fixed zoom increase
    const currentZoom = map.getZoom();
    const targetZoom = Math.min(currentZoom + 2, 18); // Add 2 zoom levels, but cap at 18
    
    // Detect if device is mobile for smoother performance
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // On mobile, just jump to the new zoom level without animation
      map.jumpTo({
        center: [lng, lat],
        zoom: targetZoom
      });
    } else {
      // On desktop, use smooth animation
      map.easeTo({
        center: [lng, lat],
        zoom: targetZoom
      });
    }
  };

  // If no clustered items, render individual markers without clustering
  if (clusteredItems.length === 0) {
    return (
      <div>
        {draggablePOIs.map(poi => (
          <MapboxPOIMarker
            key={poi.id}
            poi={poi}
            onDragEnd={onPOIDragEnd}
            onClick={() => onPOIClick(poi)}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {clusteredItems.map(item => 
        isCluster(item) ? (
          <POICluster 
            key={`cluster-${item.properties.cluster_id}`}
            cluster={item}
            onClick={() => handleClusterClick(item)}
          />
        ) : (
          <MapboxPOIMarker
            key={item.properties.id}
            poi={item.properties.poi}
            onDragEnd={onPOIDragEnd}
            onClick={() => onPOIClick(item.properties.poi)}
          />
        )
      )}
    </div>
  );
};

export default DraggablePOILayer;
