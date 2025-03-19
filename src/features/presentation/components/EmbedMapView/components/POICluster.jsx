import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { POI_CATEGORIES } from '../../../../poi/types/poi.types';
import { ICON_PATHS } from '../../../../poi/constants/icon-paths';
import './POICluster.css';

const POICluster = ({ map, cluster, onClick }) => {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !cluster) return;

    // Get the first POI from the cluster to display
    const firstPOI = cluster.properties.pois?.[0];
    if (!firstPOI) return;

    // Get the total count of additional POIs
    const additionalCount = cluster.properties.point_count - 1;

    // Get icon and color information for the first POI
    const categoryColor = POI_CATEGORIES[firstPOI.category]?.color || '#0288d1';
    const iconColor = firstPOI.style?.color;
    const markerColor = iconColor || categoryColor;

    // Create marker element
    const el = document.createElement('div');
    el.className = 'poi-cluster';

    // Create container for the marker
    const container = document.createElement('div');
    container.className = 'poi-cluster-container';

    // Create the main marker bubble with the first POI's icon
    const bubble = document.createElement('div');
    bubble.className = 'poi-cluster-bubble';
    bubble.style.backgroundColor = markerColor;

    // Get the correct icon class
    const iconClass = ICON_PATHS[firstPOI.icon] || 'fa-solid fa-map-pin';

    // Special handling for HC icon which has two icons side by side
    const iconContent = firstPOI.icon === 'ClimbHC' 
      ? `<span style="font-size: 14px; color: white;"><i class="fa-solid fa-h"></i><i class="fa-solid fa-c"></i></span>`
      : `<i class="${iconClass} marker-icon"></i>`;
    
    bubble.innerHTML = iconContent;

    // Create the count chip if there are additional POIs
    if (additionalCount > 0) {
      const countChip = document.createElement('div');
      countChip.className = 'poi-cluster-count-chip';
      countChip.textContent = `+${additionalCount}`;
      container.appendChild(countChip);
    }

    // Create the point (triangle) below the bubble
    const point = document.createElement('div');
    point.className = 'poi-cluster-point';
    point.style.borderTopColor = markerColor;

    // Add click handler
    const handleClick = (e) => {
      e.stopPropagation();
      if (onClick) onClick(cluster);
    };

    el.addEventListener('click', handleClick);

    // Add hover effect
    el.addEventListener('mouseenter', () => {
      bubble.style.transform = 'scale(1.1)';
      bubble.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.3)';
    });

    el.addEventListener('mouseleave', () => {
      bubble.style.transform = '';
      bubble.style.boxShadow = '';
    });

    // Assemble the marker
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

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      el.removeEventListener('click', handleClick);
    };
  }, [map, cluster, onClick]);

  return null;
};

export default POICluster;
