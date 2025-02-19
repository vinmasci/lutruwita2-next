import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import { ClusterFeature } from '../../utils/clustering';
import { DraggablePOI, PlaceNamePOI } from '../../../poi/types/poi.types';
import { SavedRouteState } from '../../../map/types/route.types';
import './PhotoCluster.css';

// Helper function to calculate distance between two points
const calculateDistance = (
  point1: [number, number],
  point2: [number, number]
): number => {
  const [lng1, lat1] = point1;
  const [lng2, lat2] = point2;
  return Math.sqrt(Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2));
};

// Helper function to adjust position if too close to POIs
const getAdjustedPosition = (
  clusterPosition: [number, number],
  pois: SavedRouteState['pois'],
  minDistance: number = 0.003 // Increased to ~300 meters for more noticeable offset
): [number, number] => {
  const [clusterLng, clusterLat] = clusterPosition;
  let adjustedLng = clusterLng;
  let adjustedLat = clusterLat;

  // Check distance to all POIs
  const allPOIs = [...pois.draggable, ...pois.places];
  
  for (const poi of allPOIs) {
    const distance = calculateDistance(clusterPosition, poi.coordinates);
    
    if (distance < minDistance) {
      // Calculate offset direction (move cluster away from POI)
      const offsetLng = clusterLng - poi.coordinates[0];
      const offsetLat = clusterLat - poi.coordinates[1];
      
      // Normalize the offset
      const magnitude = Math.sqrt(offsetLng * offsetLng + offsetLat * offsetLat);
      if (magnitude === 0) continue; // Skip if points are exactly the same
      
      const normalizedLng = offsetLng / magnitude;
      const normalizedLat = offsetLat / magnitude;
      
      // Apply offset to move cluster away from POI
      adjustedLng = clusterLng + (normalizedLng * minDistance);
      adjustedLat = clusterLat + (normalizedLat * minDistance);
    }
  }

  return [adjustedLng, adjustedLat];
};

interface PhotoClusterProps {
  cluster: ClusterFeature;
  onClick?: () => void;
}

export const PhotoCluster: React.FC<PhotoClusterProps> = ({ cluster, onClick }) => {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const { map } = useMapContext();
  const { getPOIsForRoute } = usePOIContext();

  useEffect(() => {
    if (!map) return;

    const el = document.createElement('div');
    el.className = 'photo-cluster';
    el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());

    // Update zoom attribute when map zooms
    const updateZoom = () => {
      el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
    };
    map.on('zoom', updateZoom);

    const container = document.createElement('div');
    container.className = 'photo-cluster-container';

    const bubble = document.createElement('div');
    bubble.className = 'photo-cluster-bubble';
    
    // Create click handler with cleanup
    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      onClick?.();
    };
    
    if (onClick) {
      bubble.addEventListener('click', handleClick);
    }

    // Add preview container
    const previewsContainer = document.createElement('div');
    previewsContainer.className = 'photo-cluster-previews';
    
    // Add preview image
    const preview = document.createElement('img');
    preview.src = cluster.properties.photos[0].thumbnailUrl;
    preview.alt = cluster.properties.photos[0].name || 'Photo preview';
    preview.onerror = () => {
      preview.src = '/images/photo-fallback.svg';
      preview.alt = 'Failed to load photo';
    };
    previewsContainer.appendChild(preview);
    bubble.appendChild(previewsContainer);

    // Add count
    const count = document.createElement('div');
    count.className = 'photo-cluster-count';
    count.textContent = cluster.properties.point_count.toString();
    bubble.appendChild(count);

    const point = document.createElement('div');
    point.className = 'photo-cluster-point';

    container.appendChild(bubble);
    container.appendChild(point);
    el.appendChild(container);

    // Get adjusted position to avoid POIs
    const poiData = getPOIsForRoute();
    const [adjustedLng, adjustedLat] = getAdjustedPosition(
      [cluster.geometry.coordinates[0], cluster.geometry.coordinates[1]],
      poiData
    );

    // Create and add marker
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat([adjustedLng, adjustedLat])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      // Clean up event listeners
      if (onClick) {
        bubble.removeEventListener('click', handleClick);
      }
      map.off('zoom', updateZoom);
    };
  }, [map, cluster, onClick, getPOIsForRoute]);

  return null;
};
