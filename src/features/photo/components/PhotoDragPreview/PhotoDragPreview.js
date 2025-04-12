import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../context/PhotoContext';

/**
 * Component that follows the mouse cursor when dragging a photo
 * to be placed on the map.
 */
export const PhotoDragPreview = ({ photo, onPlace, initialPosition }) => {
    const { map } = useMapContext();
    const { addPhoto } = usePhotoContext();
    const [position, setPosition] = useState(initialPosition || { x: 0, y: 0 });
    const previewRef = useRef(null);
    const isFirstClickRef = useRef(true); // Flag to ignore the first click
    
    // Log when component is mounted and hide cursor
    useEffect(() => {
        console.log('[PhotoDragPreview] Component mounted with photo:', photo.id);
        console.log('[PhotoDragPreview] Initial position:', initialPosition || 'Not provided');
        
        // Create a style element to hide the cursor on all elements
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            * {
                cursor: none !important;
            }
        `;
        document.head.appendChild(styleElement);
        
        // If initialPosition wasn't provided, try to get current mouse position
        if (!initialPosition) {
            const mouseX = window.event?.clientX || 0;
            const mouseY = window.event?.clientY || 0;
            console.log('[PhotoDragPreview] Fallback mouse position:', { x: mouseX, y: mouseY });
            
            // Set initial position to current mouse position
            setPosition({ x: mouseX, y: mouseY });
        }
        
        return () => {
            // Remove the style element when component unmounts
            document.head.removeChild(styleElement);
            console.log('[PhotoDragPreview] Component unmounted');
        };
    }, [photo.id, initialPosition]);
    
    // Update position on mouse move
    useEffect(() => {
        const handleMouseMove = (e) => {
            console.log('[PhotoDragPreview] Mouse position:', { x: e.clientX, y: e.clientY });
            setPosition({ x: e.clientX, y: e.clientY });
        };
        
        // Handle click to place the photo
        const handleClick = (e) => {
            // Ignore the first click (which is the one that initiated the drag)
            if (isFirstClickRef.current) {
                console.log('[PhotoDragPreview] Ignoring first click');
                isFirstClickRef.current = false;
                return;
            }
            
            if (!map) return;
            
            // Get the map container element
            const mapContainer = map.getContainer();
            if (!mapContainer) return;
            
            // Get the map bounds
            const mapBounds = mapContainer.getBoundingClientRect();
            
            // Check if the click is within the map bounds
            if (
                e.clientX >= mapBounds.left &&
                e.clientX <= mapBounds.right &&
                e.clientY >= mapBounds.top &&
                e.clientY <= mapBounds.bottom
            ) {
                // Convert screen coordinates to map coordinates
                const x = e.clientX - mapBounds.left;
                const y = e.clientY - mapBounds.top;
                const point = map.unproject([x, y]);
                const lngLat = { lng: point.lng, lat: point.lat };
                
                console.log('[PhotoDragPreview] Placing photo at:', lngLat);
                
                // Create a deep copy of the photo with the new coordinates and isManuallyPlaced flag
                const photoWithCoordinates = {
                    ...photo,
                    coordinates: lngLat,
                    isManuallyPlaced: true,
                    hasGps: true, // Now it has coordinates (even though they're manually set)
                    // Ensure we keep all the blob URLs and references
                    _blobs: photo._blobs ? { ...photo._blobs } : undefined,
                    // Make sure we preserve all image URLs
                    url: photo.url,
                    thumbnailUrl: photo.thumbnailUrl,
                    tinyThumbnailUrl: photo.tinyThumbnailUrl,
                    mediumUrl: photo.mediumUrl
                };
                
                console.log('[PhotoDragPreview] Created photo with coordinates:', {
                    id: photoWithCoordinates.id,
                    coordinates: photoWithCoordinates.coordinates,
                    hasUrls: {
                        url: !!photoWithCoordinates.url,
                        thumbnailUrl: !!photoWithCoordinates.thumbnailUrl,
                        tinyThumbnailUrl: !!photoWithCoordinates.tinyThumbnailUrl,
                        mediumUrl: !!photoWithCoordinates.mediumUrl
                    },
                    hasBlobs: !!photoWithCoordinates._blobs
                });
                
                // Add the photo to the map
                addPhoto([photoWithCoordinates]);
                
                // Call the onPlace callback
                if (onPlace) {
                    onPlace(photoWithCoordinates);
                }
                
                // Dispatch a custom event to notify the PhotoUploader component
                // that this photo has been placed on the map and should be removed from the sidebar
                const placeEvent = new CustomEvent('photo-placed-on-map', {
                    detail: {
                        photoId: photo.id
                    }
                });
                window.dispatchEvent(placeEvent);
            }
        };
        
        // Add event listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('click', handleClick);
        
        // Clean up event listeners
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleClick);
        };
    }, [map, photo, addPhoto, onPlace, position.x, position.y]);
    
    return _jsx("div", {
        ref: previewRef,
        style: {
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 9999,
            pointerEvents: 'none', // Allow clicks to pass through
            transform: 'translate(-50%, -50%)', // Center the marker on the cursor
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        },
        children: [
            // Bubble container
            _jsx("div", {
                style: {
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid #3498db', // Blue border for manually placed photos
                    boxShadow: '0 0 15px rgba(52, 152, 219, 0.7), 0 0 30px rgba(52, 152, 219, 0.5)', // Blue glow
                    backgroundColor: '#4AA4DE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                },
                children: _jsx("img", {
                    src: photo.thumbnailUrl || photo.localPreview || '/images/photo-fallback.svg',
                    alt: photo.name || 'Photo',
                    style: {
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '50%'
                    },
                    onError: (e) => {
                        e.target.src = '/images/photo-fallback.svg';
                        e.target.style.objectFit = 'contain';
                    }
                })
            }),
            // Pointer triangle
            _jsx("div", {
                style: {
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '8px solid #3498db', // Blue to match the border
                    marginTop: '-1px',
                    filter: 'drop-shadow(0 0 5px rgba(52, 152, 219, 0.7))'
                }
            })
        ]
    });
};

export default PhotoDragPreview;
