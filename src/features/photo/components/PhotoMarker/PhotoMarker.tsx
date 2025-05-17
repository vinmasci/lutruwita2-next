import React, { useEffect, useRef, useCallback } from 'react';
import './PhotoMarker.css';
import mapboxgl from 'mapbox-gl';
import { Camera } from 'lucide-react';
import { ProcessedPhoto } from '../Uploader/PhotoUploader.types';
import { useMapContext } from '../../../map/context/MapContext';

interface PhotoMarkerProps {
  photo: ProcessedPhoto;
  onClick?: () => void;
}

export const PhotoMarker: React.FC<PhotoMarkerProps> = ({ photo, onClick }) => {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const { map } = useMapContext();

  useEffect(() => {
    if (!map || !photo.coordinates || 
        typeof photo.coordinates.lng !== 'number' || 
        typeof photo.coordinates.lat !== 'number') {
      console.error('Invalid photo coordinates:', photo.coordinates);
      return;
    }

    // Allow coordinates outside normal bounds - they'll be normalized by the layer

    const el = document.createElement('div');
    el.className = 'photo-marker';
    el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());

    // Update zoom attribute when map zooms
    const updateZoom = () => {
      el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
    };
    map.on('zoom', updateZoom);

    const container = document.createElement('div');
    container.className = 'photo-marker-container';

    const bubble = document.createElement('div');
    bubble.className = 'photo-marker-bubble';
    
    // Create click handler with cleanup
    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      onClick?.();
    };
    
    if (onClick) {
      bubble.addEventListener('click', handleClick);
    }

    // Create and add the Camera icon
    const cameraIconContainer = document.createElement('div');
    // React's renderToString or a similar method would be ideal here,
    // but for simplicity in a direct DOM manipulation context,
    // we'll set innerHTML with SVG string or use a library if available.
    // For Lucide, it's easier to append a React component if this were a React-managed DOM subtree.
    // Given this is direct DOM manipulation for mapbox marker, we'll add a class and style via CSS.
    // Or, create the SVG element directly. Let's try creating the SVG icon.
    // This is a bit complex to do directly for lucide icons without ReactDOM.render.
    // A simpler approach for mapbox custom markers is to use an HTML string or style a div.
    // Let's add a placeholder for the icon and style it with CSS, or embed SVG directly.

    // We will create an instance of the Camera icon and render it to an HTML string,
    // then set it as innerHTML. This is a common pattern for map markers.
    // However, lucide-react components are meant to be used in React's virtual DOM.
    // A more direct way for Mapbox GL JS custom HTML markers is to create the DOM structure.

    const iconElement = document.createElement('div');
    iconElement.className = 'photo-marker-icon'; // We'll style this class
    // Add Camera SVG directly or use a library if it provides SVG strings.
    // For now, let's assume Camera component from lucide-react can be rendered to a string
    // or we style 'photo-marker-icon' to look like a camera.
    // A more robust way:
    // ReactDOM.render(<Camera color="white" size={24} />, iconElement);
    // But we can't call ReactDOM.render directly into this manually created element easily from here.

    // Let's use a simpler approach: add a span and use ::before with content for the icon,
    // or style the div to hold an SVG background.
    // Given the request for Lucide icons, the expectation is to use the actual SVG.
    // We'll create the SVG structure for the camera icon.
    // Lucide Camera icon path: <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle>
    // This is not ideal. Let's assume we can get the SVG string or use a class.

    // For now, let's just add the icon wrapper and style it.
    // The Camera component will be rendered by React if we return JSX, but this is a mapboxgl.Marker.
    // The standard way is to provide an HTML element.
    
    // Let's create a simple div and style it with a ::before pseudo-element in CSS
    // or embed the SVG directly if we can.
    // The simplest way to use lucide-react here is to render it to a string,
    // but that requires ReactDOMServer.
    // Alternative: create the SVG element manually.
    const svgNS = "http://www.w3.org/2000/svg";
    const svgEl = document.createElementNS(svgNS, "svg");
    svgEl.setAttribute("xmlns", svgNS);
    svgEl.setAttribute("width", "24"); // Adjust size as needed
    svgEl.setAttribute("height", "24"); // Adjust size as needed
    svgEl.setAttribute("viewBox", "0 0 24 24");
    svgEl.setAttribute("fill", "none");
    svgEl.setAttribute("stroke", "white"); // Icon color
    svgEl.setAttribute("stroke-width", "2");
    svgEl.setAttribute("stroke-linecap", "round");
    svgEl.setAttribute("stroke-linejoin", "round");

    const path1 = document.createElementNS(svgNS, "path");
    path1.setAttribute("d", "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z");
    svgEl.appendChild(path1);

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "13");
    circle.setAttribute("r", "3");
    svgEl.appendChild(circle);

    bubble.appendChild(svgEl); // Add the SVG to the bubble

    const point = document.createElement('div');
    point.className = 'photo-marker-point';

    container.appendChild(bubble);
    container.appendChild(point);
    el.appendChild(container);

    // Create and add marker
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat([photo.coordinates.lng, photo.coordinates.lat])
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
  }, [map, photo.coordinates?.lng, photo.coordinates?.lat, photo.id, onClick]); // Removed photo.thumbnailUrl and photo.name

  return null;
};
