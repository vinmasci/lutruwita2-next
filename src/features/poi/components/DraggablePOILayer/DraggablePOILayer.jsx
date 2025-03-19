import React, { useState, useEffect, useMemo } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { usePOIContext } from '../../context/POIContext';
import MapboxPOIMarker from '../MapboxPOIMarker/MapboxPOIMarker';
import POICluster from '../POICluster/POICluster';
import { clusterPOIs, isCluster, getClusterExpansionZoom } from '../../utils/clustering';

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

  // Update clustering when POIs or zoom changes
  useEffect(() => {
    if (!map || zoom === null) return;

    // Only cluster when zoomed out enough
    if (zoom <= 8.071) {
      setClusteredItems([]);
      return;
    }

    // Cluster POIs
    const clusters = clusterPOIs(draggablePOIs, zoom);
    setClusteredItems(clusters);
  }, [draggablePOIs, map, zoom]);

  // Handle cluster click
  const handleClusterClick = (cluster) => {
    if (!map) return;
    
    // Get the zoom level to expand this cluster
    const expansionZoom = getClusterExpansionZoom(cluster.properties.cluster_id, clusteredItems);
    const targetZoom = Math.min(expansionZoom + 1.5, 20); // Add 1.5 zoom levels, but cap at 20
    
    // Get the cluster's coordinates
    const [lng, lat] = cluster.geometry.coordinates;
    
    // Zoom to the cluster's location
    map.easeTo({
      center: [lng, lat],
      zoom: targetZoom
    });
  };

  // If no clustered items or zoom is too low, don't render anything
  if (clusteredItems.length === 0 && zoom > 8.071) {
    // Render individual markers without clustering
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
