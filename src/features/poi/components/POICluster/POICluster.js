import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';
import { getIconDefinition } from '../../constants/poi-icons';
import { POI_CATEGORIES } from '../../types/poi.types';
import { ICON_PATHS } from '../../constants/icon-paths';
import './POICluster.css';

export const POICluster = ({ cluster, onClick }) => {
  const markerRef = useRef(null);
  const { map } = useMapContext();

  useEffect(() => {
    if (!map) return;

    // Get the first POI from the cluster to display
    const firstPOI = cluster.properties.pois?.[0];
    if (!firstPOI) return;

    // Get the total count of additional POIs
    const additionalCount = cluster.properties.point_count - 1;

    // Get icon and color information for the first POI
    const iconDefinition = getIconDefinition(firstPOI.icon);
    const markerColor = iconDefinition?.style?.color || 
                       (POI_CATEGORIES[firstPOI.category]?.color) || 
                       '#777777'; // Default gray color if category not found

    const el = document.createElement('div');
    el.className = 'poi-cluster';
    el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());

    // Update zoom attribute when map zooms
    const updateZoom = () => {
      el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
    };
    map.on('zoom', updateZoom);

    const container = document.createElement('div');
    container.className = 'poi-cluster-container';

    // Create the main marker bubble with the first POI's icon
    const bubble = document.createElement('div');
    bubble.className = 'poi-cluster-bubble';
    bubble.style.backgroundColor = markerColor;

    // Special handling for HC icon which has two icons side by side
    const iconContent = firstPOI.icon === 'ClimbHC' 
      ? `<span style="font-size: 14px; color: white;"><i class="fa-solid fa-h"></i><i class="fa-solid fa-c"></i></span>`
      : `<i class="${ICON_PATHS[firstPOI.icon]} marker-icon"></i>`;
    
    bubble.innerHTML = iconContent;

    // Create the count chip if there are additional POIs
    if (additionalCount > 0) {
      const countChip = document.createElement('div');
      countChip.className = 'poi-cluster-count-chip';
      countChip.textContent = `+${additionalCount}`;
      container.appendChild(countChip);
    }

    // Create click handler with cleanup
    const handleClick = (e) => {
      e.stopPropagation();
      onClick?.();
    };

    if (onClick) {
      el.addEventListener('click', handleClick);
    }

    const point = document.createElement('div');
    point.className = 'poi-cluster-point';
    point.style.borderTopColor = markerColor;

    container.appendChild(bubble);
    container.appendChild(point);
    el.appendChild(container);

    // Create and add marker
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat(cluster.geometry.coordinates)
      .addTo(map);

    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      // Clean up event listeners
      if (onClick) {
        el.removeEventListener('click', handleClick);
      }
      map.off('zoom', updateZoom);
    };
  }, [map, cluster, onClick]);

  return null;
};

export default POICluster;
