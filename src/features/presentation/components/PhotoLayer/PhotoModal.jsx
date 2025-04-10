import React, { useState, useEffect, useCallback } from 'react';
import { 
  Paper, 
  IconButton, 
  Typography, 
  Box,
  CircularProgress
} from '@mui/material';
import { 
  Close as CloseIcon, 
  NavigateNext as NextIcon, 
  NavigateBefore as PrevIcon
} from '@mui/icons-material';
import { useMapContext } from '../../../map/context/MapContext';

/**
 * A small modal component for displaying photos in presentation mode
 * Features:
 * - Shows photos in a small fixed-position modal 
 * - Navigation arrows to cycle through nearby photos
 * - Map pans to the location of the current photos
 * 
 * @param {Object} props - Component props
 * @param {Object} props.photo - The photo to display
 * @param {Function} props.onClose - Function to call when closing the modal
 * @param {Array} props.additionalPhotos - Optional array of additional photos for navigation
 */
export const PhotoModal = ({ photo, onClose, additionalPhotos, initialIndex = 0, onPhotoChange }) => {
  // Get map context for panning
  const { map } = useMapContext();
  
  // Use all photos if provided, otherwise just the single photo
  const photos = additionalPhotos || [photo];
  
  // Use the initialIndex prop to set the initial selectedIndex
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [imageError, setImageError] = useState(false);
  
  // Local state to track photos
  const [localPhotos, setLocalPhotos] = useState(photos);
  
  // State for image loading
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [loadedPhotos, setLoadedPhotos] = useState(new Set());
  const [preloadingPhotos, setPreloadingPhotos] = useState(new Set());
  
  // Update local photos when props change and update the selected index
  useEffect(() => {
    // Always update the photos array
    setLocalPhotos(photos);
    
    // Update the selected index when initialIndex changes
    setSelectedIndex(initialIndex);
    
    console.log(`Setting index to ${initialIndex} of ${photos.length} photos`);
  }, [photos, initialIndex]);
  
  // Get the currently selected photo
  const selectedPhoto = localPhotos[selectedIndex];
  
  // Determine if the user is on a mobile device
  const isMobileDevice = useCallback(() => {
    return window.innerWidth <= 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);
  
  // Function to preload a photo
  const preloadPhoto = useCallback((photo) => {
    if (!photo || loadedPhotos.has(photo.url) || preloadingPhotos.has(photo.url)) {
      return; // Skip if already loaded or preloading
    }
    
    // Mark as preloading
    setPreloadingPhotos(prev => new Set([...prev, photo.url]));
    
    // Create an image element to preload
    const img = new Image();
    img.onload = () => {
      // Mark as loaded once complete
      setLoadedPhotos(prev => new Set([...prev, photo.url]));
      setPreloadingPhotos(prev => {
        const newSet = new Set([...prev]);
        newSet.delete(photo.url);
        return newSet;
      });
    };
    img.src = getBestImageUrl(photo);
  }, [loadedPhotos, preloadingPhotos]);
  
  // Call onPhotoChange when the selected photo changes
  useEffect(() => {
    if (onPhotoChange && selectedPhoto) {
      onPhotoChange(selectedPhoto);
    }
  }, [selectedPhoto, onPhotoChange]);
  
  // Preload adjacent photos when selected photo changes
  useEffect(() => {
    if (!selectedPhoto) return;
    
    // Mark current photo as loading if not already loaded
    setIsImageLoading(!loadedPhotos.has(selectedPhoto.url));
    
    // Find indices of next and previous photos
    const currentIndex = localPhotos.findIndex(p => p.url === selectedPhoto.url);
    const nextIndex = (currentIndex + 1) % localPhotos.length;
    const prevIndex = (currentIndex - 1 + localPhotos.length) % localPhotos.length;
    
    // Preload next and previous photos
    const nextPhoto = localPhotos[nextIndex];
    const prevPhoto = localPhotos[prevIndex];
    
    // Use setTimeout to stagger the preloading (current photo gets priority)
    setTimeout(() => {
      if (nextPhoto) preloadPhoto(nextPhoto);
    }, 300);
    
    setTimeout(() => {
      if (prevPhoto) preloadPhoto(prevPhoto);
    }, 600);
    
  }, [selectedPhoto, localPhotos, preloadPhoto, loadedPhotos]);
  
  // Navigation handlers
  const handleNext = useCallback(() => {
    const newIndex = (selectedIndex + 1) % localPhotos.length;
    setSelectedIndex(newIndex);
    setImageError(false); // Reset error state when changing photos
    
    // Get the next photo
    const nextPhoto = localPhotos[newIndex];
    
    // Check if the next photo is already loaded
    if (nextPhoto && nextPhoto.url) {
      setIsImageLoading(!loadedPhotos.has(nextPhoto.url));
    } else {
      setIsImageLoading(true); // Default to loading if we can't check
    }
    
    // Pan the map to the new photo's location
    if (map && nextPhoto && nextPhoto.coordinates) {
      const isMobile = isMobileDevice();
      map.easeTo({
        center: [nextPhoto.coordinates.lng, nextPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        pitch: isMobile ? 0 : 60, // No pitch on mobile
        duration: isMobile ? 300 : 500 // Faster on mobile
      });
    }
  }, [localPhotos, selectedIndex, map, isMobileDevice, loadedPhotos]);
  
  const handlePrev = useCallback(() => {
    const newIndex = (selectedIndex - 1 + localPhotos.length) % localPhotos.length;
    setSelectedIndex(newIndex);
    setImageError(false); // Reset error state when changing photos
    
    // Get the previous photo
    const prevPhoto = localPhotos[newIndex];
    
    // Check if the previous photo is already loaded
    if (prevPhoto && prevPhoto.url) {
      setIsImageLoading(!loadedPhotos.has(prevPhoto.url));
    } else {
      setIsImageLoading(true); // Default to loading if we can't check
    }
    
    // Pan the map to the new photo's location
    if (map && prevPhoto && prevPhoto.coordinates) {
      const isMobile = isMobileDevice();
      map.easeTo({
        center: [prevPhoto.coordinates.lng, prevPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        pitch: isMobile ? 0 : 60, // No pitch on mobile
        duration: isMobile ? 300 : 500 // Faster on mobile
      });
    }
  }, [localPhotos, selectedIndex, map, isMobileDevice, loadedPhotos]);
  
  // Pan to the initial photo when the popup opens and pitch the map
  useEffect(() => {
    if (map && selectedPhoto && selectedPhoto.coordinates) {
      const isMobile = isMobileDevice();
      
      // Use a single map.easeTo call with appropriate pitch based on device
      map.easeTo({
        center: [selectedPhoto.coordinates.lng, selectedPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        pitch: isMobile ? 0 : 60, // No pitch on mobile, 60 degrees on desktop
        duration: isMobile ? 300 : 500 // Faster transition on mobile
      });
    }
    
    // Restore pitch to 0 when component unmounts
    return () => {
      if (map) {
        map.easeTo({
          pitch: 0,
          duration: 500
        });
      }
    };
  }, [map, selectedPhoto, isMobileDevice]);
  
  // Touch swipe state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;
  
  // Touch handlers for swipe functionality
  const handleTouchStart = (e) => {
    setTouchEnd(null); // Reset touchEnd
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    // Handle swipe based on direction
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
    
    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
  };
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'Escape':
          onClose();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNext, handlePrev, onClose]);
  
  
  // Determine the best image URL to use based on device type
  const getBestImageUrl = (photo) => {
    const isMobile = isMobileDevice();
    
    // For local photos
    if (photo.isLocal) {
      if (isMobile) {
        // On mobile, prioritize medium images but never use thumbnails unless nothing else is available
        return photo.mediumUrl || photo.largeUrl || photo.url || photo.thumbnailUrl || photo.tinyThumbnailUrl;
      } else {
        // On desktop, prioritize large images for better quality
        return photo.largeUrl || photo.url || photo.mediumUrl || photo.thumbnailUrl || photo.tinyThumbnailUrl;
      }
    }
    
    // For Cloudinary photos
    if (isMobile) {
      // On mobile, prioritize medium images but never use thumbnails unless nothing else is available
      return photo.mediumUrl || photo.largeUrl || photo.url || photo.thumbnailUrl || photo.tinyThumbnailUrl;
    } else {
      // On desktop, prioritize large images for better quality
      return photo.largeUrl || photo.url || photo.mediumUrl || photo.thumbnailUrl || photo.tinyThumbnailUrl;
    }
  };
  
  // Handle image loading
  const handleImageLoad = () => {
    setIsImageLoading(false);
    setLoadedPhotos(prev => new Set([...prev, selectedPhoto.url]));
  };
  
  // Handle image loading error
  const handleImageError = () => {
    console.error('Failed to load image:', getBestImageUrl(selectedPhoto));
    setIsImageLoading(false);
    setImageError(true);
  };
  
  if (!selectedPhoto) {
    return null;
  }
  
  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed', // Fixed position relative to the viewport
        top: '40%', // More higher than before
        left: '75%', // Much further to the right
        transform: 'translate(-50%, -50%)', // Center the modal with the offset
        width: 600, // Twice as big (was 300)
        maxWidth: '90vw',
        zIndex: 9999, // Very high z-index to ensure it's on top
        overflow: 'hidden',
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)' // More prominent shadow
      }}
    >
      {/* Main image container - no header */}
      <Box 
        sx={{
          position: "relative", 
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "black",
          height: 400, // Twice as big (was 200)
          overflow: "hidden",
          padding: 0
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image with loading indicator */}
        {!imageError ? (
          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Loading indicator */}
            {isImageLoading && (
              <Box 
                sx={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  zIndex: 1
                }}
              >
                <CircularProgress size={40} sx={{ color: 'white' }} />
              </Box>
            )}
            
            {/* The image itself */}
            <img
              src={getBestImageUrl(selectedPhoto)}
              alt={selectedPhoto.name || 'Photo'}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              style={{
                height: '100%',
                width: '100%',
                objectFit: 'cover', // Fill the container while maintaining aspect ratio
                objectPosition: 'center' // Center the image
              }}
            />
          </Box>
        ) : (
          <Box 
            sx={{
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              justifyContent: "center",
              p: 2,
              color: "white"
            }}
          >
            <img 
              src="/images/photo-fallback.svg" 
              alt="Failed to load" 
              style={{ width: 50, height: 50, marginBottom: 8 }} 
            />
            <Typography variant="caption">
              Failed to load image
            </Typography>
          </Box>
        )}
        
        {/* Navigation buttons */}
        {localPhotos.length > 1 && (
          <>
            <IconButton
              onClick={handlePrev}
              sx={{
                position: 'absolute',
                left: 24,
                bgcolor: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: 1.5,
                width: 40,
                height: 40,
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.9)'
                }
              }}
              aria-label="previous photo"
              size="medium"
            >
              <PrevIcon sx={{ fontSize: 24 }} />
            </IconButton>
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 24,
                bgcolor: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: 1.5,
                width: 40,
                height: 40,
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.9)'
                }
              }}
              aria-label="next photo"
              size="medium"
            >
              <NextIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </>
        )}
      </Box>
      
      {/* Caption display */}
      {selectedPhoto.caption && selectedPhoto.caption.trim() !== '' && (
        <Box 
          sx={{
            p: 1.5, 
            bgcolor: "rgba(0,0,0,0.5)",
            borderTop: "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <Typography 
            variant="body2" 
            color="white"
            sx={{ 
              fontStyle: 'normal',
              opacity: 1
            }}
          >
            {selectedPhoto.caption}
          </Typography>
        </Box>
      )}
      
      {/* Footer with photo count and route info */}
      <Box 
        sx={{
          p: 1.5, 
          bgcolor: "rgba(0,0,0,0.7)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        {/* Route info (left side) */}
        <Typography variant="caption" color="white">
          {selectedPhoto.routeIndex !== undefined && selectedPhoto.routeIndex !== Infinity ? 
            `Route ${selectedPhoto.routeIndex + 1}${selectedPhoto.distanceAlongRoute !== undefined ? 
              ` • ${selectedPhoto.distanceAlongRoute !== Infinity ? 
                `${(selectedPhoto.distanceAlongRoute / 1000).toFixed(1)}km` : ''}` : ''}` : 
            ''}
        </Typography>
        
        {/* Photo count (center) */}
        <Typography variant="caption" color="white">
          {selectedIndex + 1} / {localPhotos.length}
        </Typography>
      </Box>
      
      {/* Close button in top-right corner */}
      <IconButton 
        onClick={onClose} 
        size="small" 
        aria-label="close"
        sx={{ 
          position: 'absolute',
          top: 8,
          right: 8,
          bgcolor: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: 0.5,
          '&:hover': {
            bgcolor: 'rgba(0,0,0,0.7)'
          }
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
};

export default PhotoModal;
