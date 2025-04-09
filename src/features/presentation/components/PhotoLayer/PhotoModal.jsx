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
 * - Optimized for mobile performance with lazy loading
 * 
 * @param {Object} props - Component props
 * @param {Object} props.photo - The photo to display
 * @param {Function} props.onClose - Function to call when closing the modal
 * @param {Array} props.additionalPhotos - Optional array of additional photos for navigation
 */
export const PhotoModal = ({ photo, onClose, additionalPhotos, initialIndex = 0, onPhotoChange }) => {
  // Get map context for panning
  const { map } = useMapContext();
  
  // Store photo references instead of full objects to reduce memory usage
  const photoRefs = additionalPhotos || [photo];
  
  // Use the initialIndex prop to set the initial selectedIndex
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  
  // Get the currently selected photo reference
  const selectedPhoto = photoRefs[selectedIndex];
  
  // Call onPhotoChange when the selected photo changes
  useEffect(() => {
    if (onPhotoChange && selectedPhoto) {
      onPhotoChange(selectedPhoto);
    }
    
    // Reset loading and error states when photo changes
    setIsImageLoading(true);
    setImageError(false);
  }, [selectedPhoto, onPhotoChange]);
  
  // Determine if the user is on a mobile device
  const isMobileDevice = useCallback(() => {
    return window.innerWidth <= 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);
  
  // Navigation handlers
  const handleNext = useCallback(() => {
    const newIndex = (selectedIndex + 1) % photoRefs.length;
    setSelectedIndex(newIndex);
    setImageError(false);
    setIsImageLoading(true);
    
    // Pan the map to the new photo's location
    const nextPhoto = photoRefs[newIndex];
    if (map && nextPhoto && nextPhoto.coordinates) {
      const isMobile = isMobileDevice();
      map.easeTo({
        center: [nextPhoto.coordinates.lng, nextPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        pitch: isMobile ? 0 : 60, // No pitch on mobile
        duration: isMobile ? 300 : 500 // Shorter duration on mobile
      });
    }
  }, [photoRefs, selectedIndex, map, isMobileDevice]);
  
  const handlePrev = useCallback(() => {
    const newIndex = (selectedIndex - 1 + photoRefs.length) % photoRefs.length;
    setSelectedIndex(newIndex);
    setImageError(false);
    setIsImageLoading(true);
    
    // Pan the map to the new photo's location
    const prevPhoto = photoRefs[newIndex];
    if (map && prevPhoto && prevPhoto.coordinates) {
      const isMobile = isMobileDevice();
      map.easeTo({
        center: [prevPhoto.coordinates.lng, prevPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        pitch: isMobile ? 0 : 60, // No pitch on mobile
        duration: isMobile ? 300 : 500 // Shorter duration on mobile
      });
    }
  }, [photoRefs, selectedIndex, map, isMobileDevice]);
  
  // Pan to the initial photo when the popup opens and pitch the map
  useEffect(() => {
    if (map && selectedPhoto && selectedPhoto.coordinates) {
      const isMobile = isMobileDevice();
      map.easeTo({
        center: [selectedPhoto.coordinates.lng, selectedPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        pitch: isMobile ? 0 : 60, // No pitch on mobile, 60-degree pitch on desktop
        duration: isMobile ? 300 : 800 // Shorter duration on mobile
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
  // Optimized to use smaller images on mobile
  const getBestImageUrl = (photo) => {
    const isMobile = isMobileDevice();
    
    if (!photo) return null;
    
    // For local photos
    if (photo.isLocal) {
      if (isMobile) {
        // On mobile, strictly prioritize smaller images
        return photo.thumbnailUrl || photo.tinyThumbnailUrl || photo.mediumUrl || photo.url || photo.largeUrl;
      } else {
        // On desktop, prioritize large images for better quality
        return photo.largeUrl || photo.url || photo.mediumUrl || photo.thumbnailUrl || photo.tinyThumbnailUrl;
      }
    }
    
    // For Cloudinary photos
    if (isMobile) {
      // On mobile, strictly prioritize smaller images
      return photo.thumbnailUrl || photo.tinyThumbnailUrl || photo.mediumUrl || photo.url || photo.largeUrl;
    } else {
      // On desktop, prioritize large images for better quality
      return photo.largeUrl || photo.url || photo.mediumUrl || photo.thumbnailUrl || photo.tinyThumbnailUrl;
    }
  };
  
  // Handle image loading error
  const handleImageError = () => {
    console.error('Failed to load image:', getBestImageUrl(selectedPhoto));
    setImageError(true);
    setIsImageLoading(false);
  };
  
  // Handle image load success
  const handleImageLoad = () => {
    setIsImageLoading(false);
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
        width: isMobileDevice() ? 400 : 600, // Smaller on mobile
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
          height: isMobileDevice() ? 300 : 400, // Smaller on mobile
          overflow: "hidden",
          padding: 0
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Loading indicator */}
        {isImageLoading && !imageError && (
          <Box 
            sx={{
              position: 'absolute',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              zIndex: 1
            }}
          >
            <CircularProgress size={40} sx={{ color: 'white' }} />
          </Box>
        )}
        
        {/* Image */}
        {!imageError ? (
          <img
            src={getBestImageUrl(selectedPhoto)}
            alt={selectedPhoto.name || 'Photo'}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{
              height: '100%',
              width: '100%',
              objectFit: 'cover', // Fill the container while maintaining aspect ratio
              objectPosition: 'center', // Center the image
              opacity: isImageLoading ? 0.3 : 1, // Fade in when loaded
              transition: 'opacity 0.3s ease'
            }}
          />
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
        {photoRefs.length > 1 && (
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
          {selectedIndex + 1} / {photoRefs.length}
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
