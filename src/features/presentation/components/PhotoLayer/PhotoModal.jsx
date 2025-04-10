import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // State for staged loading (to prevent iOS crashes)
  const [isContentReady, setIsContentReady] = useState(false);
  
  // Detect iOS devices
  const isIOS = useCallback(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }, []);
  
  // Update local photos when props change and update the selected index
  useEffect(() => {
    // Always update the photos array
    setLocalPhotos(photos);
    
    // Update the selected index when initialIndex changes
    setSelectedIndex(initialIndex);
    
    // Only log index information on desktop
    if (!isMobileDevice()) {
      console.log(`Setting index to ${initialIndex} of ${photos.length} photos`);
    }
    
    // Delay setting content ready to prevent too many operations at once
    // Use a longer delay on iOS devices
    const delay = isIOS() ? 600 : 300;
    const timer = setTimeout(() => {
      setIsContentReady(true);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [photos, initialIndex, isIOS]);
  
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
  
  // Track preload attempts to prevent excessive preloading
  const preloadAttemptsRef = useRef(0);
  
  // Call onPhotoChange when the selected photo changes
  useEffect(() => {
    if (onPhotoChange && selectedPhoto) {
      onPhotoChange(selectedPhoto);
    }
  }, [selectedPhoto, onPhotoChange]);
  
  // Preload adjacent photos when selected photo changes
  useEffect(() => {
    if (!selectedPhoto || !isContentReady) return;
    
    // Mark current photo as loading if not already loaded
    setIsImageLoading(!loadedPhotos.has(selectedPhoto.url));
    
    // Reset preload attempts counter when selected photo changes
    preloadAttemptsRef.current = 0;
    
    // Find indices of next and previous photos
    const currentIndex = localPhotos.findIndex(p => p.url === selectedPhoto.url);
    const nextIndex = (currentIndex + 1) % localPhotos.length;
    const prevIndex = (currentIndex - 1 + localPhotos.length) % localPhotos.length;
    
    // Preload next and previous photos
    const nextPhoto = localPhotos[nextIndex];
    const prevPhoto = localPhotos[prevIndex];
    
    // Use longer timeouts on iOS to prevent overwhelming the device
    const isIOSDevice = isIOS();
    const baseDelay = isIOSDevice ? 800 : 400;
    
    // Use setTimeout to stagger the preloading (current photo gets priority)
    // Only preload if we haven't exceeded the maximum number of preload attempts
    if (preloadAttemptsRef.current < 3) {
      setTimeout(() => {
        if (nextPhoto) {
          preloadPhoto(nextPhoto);
          preloadAttemptsRef.current += 1;
        }
      }, baseDelay);
      
      setTimeout(() => {
        if (prevPhoto) {
          preloadPhoto(prevPhoto);
          preloadAttemptsRef.current += 1;
        }
      }, baseDelay * 2);
    }
    
  }, [selectedPhoto, localPhotos, preloadPhoto, loadedPhotos, isContentReady, isIOS]);
  
  // Navigation handlers with debounce to prevent rapid firing
  const isNavigatingRef = useRef(false);
  
  const handleNext = useCallback(() => {
    // Prevent rapid navigation
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    
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
    
    // Pan the map to the new photo's location, but maintain current pitch
    if (map && nextPhoto && nextPhoto.coordinates) {
      const isMobile = isMobileDevice();
      map.easeTo({
        center: [nextPhoto.coordinates.lng, nextPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        // Don't change pitch, maintain the current pitch
        duration: isMobile ? 300 : 500 // Faster on mobile
      });
    }
    
    // Reset navigation lock after a delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, isIOS() ? 800 : 400);
    
  }, [localPhotos, selectedIndex, map, isMobileDevice, loadedPhotos, isIOS]);
  
  const handlePrev = useCallback(() => {
    // Prevent rapid navigation
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    
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
    
    // Pan the map to the new photo's location, but maintain current pitch
    if (map && prevPhoto && prevPhoto.coordinates) {
      const isMobile = isMobileDevice();
      map.easeTo({
        center: [prevPhoto.coordinates.lng, prevPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        // Don't change pitch, maintain the current pitch
        duration: isMobile ? 300 : 500 // Faster on mobile
      });
    }
    
    // Reset navigation lock after a delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, isIOS() ? 800 : 400);
    
  }, [localPhotos, selectedIndex, map, isMobileDevice, loadedPhotos, isIOS]);
  
  // Set the pitch only once when the modal opens
  const pitchSetRef = useRef(false);
  
  // Initial setup when the modal first opens - set pitch only once
  useEffect(() => {
    if (!map) return;
    
    // Set the pitch only once when the modal first opens
    if (!pitchSetRef.current) {
      const isMobile = isMobileDevice();
      
      // Set the pitch based on device type
      map.setPitch(isMobile ? 0 : 60);
      
      // Mark that we've set the pitch
      pitchSetRef.current = true;
    }
    
    // Restore pitch to 0 when component unmounts
    return () => {
      if (map) {
        map.easeTo({
          pitch: 0,
          duration: 500
        });
        
        // Reset the ref when component unmounts
        pitchSetRef.current = false;
      }
    };
  }, [map, isMobileDevice]);
  
  // Pan to the photo location when the selected photo changes
  useEffect(() => {
    if (!isContentReady || !map || !selectedPhoto || !selectedPhoto.coordinates) return;
    
    const isMobile = isMobileDevice();
    
    // Just pan to the location without changing pitch
    map.panTo(
      [selectedPhoto.coordinates.lng, selectedPhoto.coordinates.lat],
      { duration: isMobile ? 300 : 500 } // Faster transition on mobile
    );
    
  }, [map, selectedPhoto, isMobileDevice, isContentReady]);
  
  // Touch swipe state with debounce to prevent rapid firing
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const touchInProgressRef = useRef(false);
  
  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;
  
  // Touch handlers for swipe functionality
  const handleTouchStart = (e) => {
    if (touchInProgressRef.current) return;
    
    setTouchEnd(null); // Reset touchEnd
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e) => {
    if (touchInProgressRef.current) return;
    
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (touchInProgressRef.current || !touchStart || !touchEnd) return;
    
    touchInProgressRef.current = true;
    
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
    
    // Reset touch in progress after a delay
    setTimeout(() => {
      touchInProgressRef.current = false;
    }, isIOS() ? 800 : 400);
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
  
  // Only render content when it's ready to prevent overwhelming the device
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
      {!isContentReady ? (
        <Box 
          sx={{
            position: "relative", 
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            bgcolor: "black",
            height: 400,
            overflow: "hidden",
            padding: 0
          }}
        >
          <CircularProgress size={40} sx={{ color: 'white' }} />
        </Box>
      ) : (
        <>
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
          
          {/* Photo count (center) - only show on desktop */}
          {!isMobileDevice() && (
            <Typography variant="caption" color="white">
              {selectedIndex + 1} / {localPhotos.length}
            </Typography>
          )}
        </Box>
        </>
      )}
      
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
