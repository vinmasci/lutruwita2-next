import { useEffect, useRef, useState } from 'react';
import './PhotoMarker.css';
import mapboxgl from 'mapbox-gl';
import { useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../context/PhotoContext';
import { getPhotoIdentifier } from '../../utils/clustering';

// Helper function to check if an element is in presentation mode
const isInPresentationMode = (element) => {
    if (!element) return false;
    
    // Check if this element or any parent has the presentation-photo-layer class
    let current = element;
    while (current) {
        if (current.classList && current.classList.contains('presentation-photo-layer')) {
            return true;
        }
        current = current.parentElement;
    }
    
    return false;
};

// Add isEditable and isPresentationMode props, default to false for safety
export const PhotoMarker = ({ photo, onClick, isHighlighted, isEditable = false, isPresentationMode = false }) => {
    const markerRef = useRef(null);
    const markerElementRef = useRef(null);
    const { map } = useMapContext();
    const { updatePhotoPosition, changedPhotos } = usePhotoContext();
    const [isDragging, setIsDragging] = useState(false);
    
    // Check if this photo has unsaved changes
    const photoId = getPhotoIdentifier(photo.url);
    const hasUnsavedChanges = photoId && changedPhotos.has(photoId);
    
    // Determine if the marker should be draggable based on the isEditable prop
    const isDraggable = isEditable === true;

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
        
        // Store reference to the element
        markerElementRef.current = el;

        // Update zoom attribute when map zooms
        const updateZoom = () => {
            el.setAttribute('data-zoom', Math.floor(map.getZoom()).toString());
        };
        map.on('zoom', updateZoom);

        const container = document.createElement('div');
        container.className = 'photo-marker-container';
        
        const bubble = document.createElement('div');
        bubble.className = 'photo-marker-bubble';
        
        // Check if this marker is in presentation mode
        const inPresentationMode = isPresentationMode || document.querySelector('.presentation-photo-layer') !== null;
        
        // Apply highlighted class if needed
        if (isHighlighted) {
            bubble.classList.add('highlighted');
            container.classList.add('highlighted');
        } else if (inPresentationMode) {
            // In presentation mode, ensure non-highlighted markers don't have the highlighted class
            bubble.classList.remove('highlighted');
            container.classList.remove('highlighted');
            
            // Add a presentation-mode class to help with CSS targeting
            bubble.classList.add('presentation-mode');
            container.classList.add('presentation-mode');
        }
        
        // Apply manually placed class if needed
        if (photo.isManuallyPlaced) {
            bubble.classList.add('manually-placed');
            container.classList.add('manually-placed');
        }
        
        // Apply unsaved changes class if needed
        if (hasUnsavedChanges) {
            bubble.classList.add('unsaved-changes');
            container.classList.add('unsaved-changes');
        }

        // Create click handler with cleanup
        const handleClick = (e) => {
            e.stopPropagation();
            onClick?.();
        };

        if (onClick) {
            bubble.addEventListener('click', handleClick);
        }
        
        let finalThumbnailUrl = photo.tinyThumbnailUrl || photo.thumbnailUrl;

        if (!finalThumbnailUrl && photo.publicId && photo.url) {
            try {
                const urlParts = photo.url.split('/');
                // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v12345/public_id.jpg
                // We need to find "cloud_name"
                const cloudinaryBase = "https://res.cloudinary.com/";
                if (photo.url.startsWith(cloudinaryBase)) {
                    const pathAfterBase = photo.url.substring(cloudinaryBase.length);
                    const cloudName = pathAfterBase.split('/')[0];
                    if (cloudName) {
                        // Construct a thumbnail URL, e.g., 50x50 fill crop
                        finalThumbnailUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_50,h_50,c_fill,g_auto/${photo.publicId}`;
                        console.log('[PhotoMarker] Constructed Cloudinary thumbnail URL:', finalThumbnailUrl);
                    }
                }
            } catch (e) {
                console.error('[PhotoMarker] Error constructing Cloudinary thumbnail URL:', e);
            }
        }
        
        // Create image element
        const img = document.createElement('img');
        
        // Set up error handler for fallback
        img.onerror = () => {
            console.error('Failed to load photo thumbnail:', img.src);
            img.src = '/images/photo-fallback.svg'; // A generic fallback image
            img.alt = 'Photo not available';
        };
        
        // Set alt text
        img.alt = photo.name || 'Photo';
        
        if (finalThumbnailUrl) {
            img.src = finalThumbnailUrl;
        } else {
            // No thumbnail URL could be determined, use fallback
            console.warn('[PhotoMarker] No thumbnail URL available for photo:', photo.id || photo.url, 'Using fallback.');
            img.src = '/images/photo-fallback.svg';
            img.alt = 'No thumbnail available';
        }
        
        // Add the image to the bubble
        bubble.appendChild(img);
        
        const point = document.createElement('div');
        point.className = 'photo-marker-point';
        container.appendChild(bubble);
        container.appendChild(point);
        el.appendChild(container);

        // Create and add marker
        const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center',
            draggable: isDraggable // Make the marker draggable if it's manually placed
        })
            .setLngLat([photo.coordinates.lng, photo.coordinates.lat])
            .addTo(map);
            
        // Add draggable class if needed
        if (isDraggable) {
            el.classList.add('draggable');
        }
        
        // Add drag event handlers if draggable
        if (isDraggable) {
            marker.on('dragstart', () => {
                setIsDragging(true);
                console.log('[PhotoMarker] Started dragging photo:', photo.url);
            });
            
            marker.on('dragend', () => {
                const newPosition = marker.getLngLat();
                console.log('[PhotoMarker] Finished dragging photo to:', newPosition);
                
                // Update the photo's position in the context
                updatePhotoPosition(photo.url, {
                    lng: newPosition.lng,
                    lat: newPosition.lat
                });
                
                setIsDragging(false);
            });
        }

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
    }, [map, photo.coordinates?.lng, photo.coordinates?.lat, photo.id, photo.name, photo.isManuallyPlaced, onClick, isHighlighted, updatePhotoPosition, isDraggable, hasUnsavedChanges]);

    // Update highlighted state when it changes
    useEffect(() => {
        if (markerElementRef.current) {
            const bubble = markerElementRef.current.querySelector('.photo-marker-bubble');
            const container = markerElementRef.current.querySelector('.photo-marker-container');
            
            // Check if this marker is in presentation mode
            const inPresentationMode = isPresentationMode || document.querySelector('.presentation-photo-layer') !== null;
            
            if (bubble && container) {
                // Handle highlighted state
                if (isHighlighted) {
                    bubble.classList.add('highlighted');
                    container.classList.add('highlighted');
                    
                    // In presentation mode, make sure the presentation-mode class is removed
                    if (inPresentationMode) {
                        bubble.classList.remove('presentation-mode');
                        container.classList.remove('presentation-mode');
                    }
                } else {
                    bubble.classList.remove('highlighted');
                    container.classList.remove('highlighted');
                    
                    // In presentation mode, add the presentation-mode class to non-highlighted markers
                    if (inPresentationMode) {
                        bubble.classList.add('presentation-mode');
                        container.classList.add('presentation-mode');
                    }
                }
                
                // Handle manually placed state
                if (photo.isManuallyPlaced) {
                    bubble.classList.add('manually-placed');
                    container.classList.add('manually-placed');
                } else {
                    bubble.classList.remove('manually-placed');
                    container.classList.remove('manually-placed');
                }
                
                // Handle unsaved changes state
                if (hasUnsavedChanges) {
                    bubble.classList.add('unsaved-changes');
                    container.classList.add('unsaved-changes');
                } else {
                    bubble.classList.remove('unsaved-changes');
                    container.classList.remove('unsaved-changes');
                }
            }
        }
    }, [isHighlighted, photo.isManuallyPlaced, hasUnsavedChanges]);

    // Debug log to check which markers are highlighted
    useEffect(() => {
        if (isHighlighted) {
            console.log('Highlighted marker:', photo.url);
        }
    }, [isHighlighted, photo.url]);

    return null;
};
