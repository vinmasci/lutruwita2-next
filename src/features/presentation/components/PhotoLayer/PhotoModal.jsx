import React, { useState, useEffect, useCallback } from 'react';
import { 
  Paper, 
  IconButton, 
  Typography, 
  Box
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
 * - Map pans to the location of the current photo
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
  
  // Call onPhotoChange when the selected photo changes
  useEffect(() => {
    if (onPhotoChange && selectedPhoto) {
      onPhotoChange(selectedPhoto);
    }
  }, [selectedPhoto, onPhotoChange]);
  
  // Navigation handlers
  const handleNext = useCallback(() => {
    const newIndex = (selectedIndex + 1) % localPhotos.length;
    setSelectedIndex(newIndex);
    setImageError(false); // Reset error state when changing photos
    
    // Pan the map to the new photo's location
    const nextPhoto = localPhotos[newIndex];
    if (map && nextPhoto && nextPhoto.coordinates) {
      map.easeTo({
        center: [nextPhoto.coordinates.lng, nextPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        pitch: 60, // Keep the 60-degree pitch
        duration: 500 // Smooth transition over 0.5 seconds
      });
    }
  }, [localPhotos, selectedIndex, map]);
  
  const handlePrev = useCallback(() => {
    const newIndex = (selectedIndex - 1 + localPhotos.length) % localPhotos.length;
    setSelectedIndex(newIndex);
    setImageError(false); // Reset error state when changing photos
    
    // Pan the map to the new photo's location
    const prevPhoto = localPhotos[newIndex];
    if (map && prevPhoto && prevPhoto.coordinates) {
      map.easeTo({
        center: [prevPhoto.coordinates.lng, prevPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        pitch: 60, // Keep the 60-degree pitch
        duration: 500 // Smooth transition over 0.5 seconds
      });
    }
  }, [localPhotos, selectedIndex, map]);
  
  // Pan to the initial photo when the popup opens and pitch the map
  useEffect(() => {
    if (map && selectedPhoto && selectedPhoto.coordinates) {
      map.easeTo({
        center: [selectedPhoto.coordinates.lng, selectedPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        pitch: 60, // Add a 60-degree pitch to angle the map
        duration: 800 // Slightly longer transition for the pitch change
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
  }, [map, selectedPhoto]);
  
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
  
  // Determine if the user is on a mobile device
  const isMobileDevice = () => {
    return window.innerWidth <= 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };
  
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
  
  // Handle image loading error
  const handleImageError = () => {
    console.error('Failed to load image:', getBestImageUrl(selectedPhoto));
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
      >
        {/* Image */}
        {!imageError ? (
          <img
            src={getBestImageUrl(selectedPhoto)}
            alt={selectedPhoto.name || 'Photo'}
            onError={handleImageError}
            style={{
              height: '100%',
              width: '100%',
              objectFit: 'cover', // Fill the container while maintaining aspect ratio
              objectPosition: 'center' // Center the image
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
        {localPhotos.length > 1 && (
          <>
            <IconButton
              onClick={handlePrev}
              sx={{
                position: 'absolute',
                left: 8,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: 0.5,
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.7)'
                }
              }}
              aria-label="previous photo"
              size="small"
            >
              <PrevIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 8,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: 0.5,
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.7)'
                }
              }}
              aria-label="next photo"
              size="small"
            >
              <NextIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </Box>
      
      {/* Footer with photo count and route info */}
      <Box 
        sx={{
          p: 0.5, 
          bgcolor: "rgba(0,0,0,0.7)",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        {/* Route info (left side) */}
        <Typography variant="caption" color="white" sx={{ px: 1 }}>
          {selectedPhoto.routeIndex !== undefined && selectedPhoto.routeIndex !== Infinity ? 
            `Route ${selectedPhoto.routeIndex + 1}${selectedPhoto.distanceAlongRoute !== undefined ? 
              ` • ${selectedPhoto.distanceAlongRoute !== Infinity ? 
                `${(selectedPhoto.distanceAlongRoute / 1000).toFixed(1)}km` : ''}` : ''}` : 
            ''}
        </Typography>
        
        {/* Photo count (right side) */}
        <Typography variant="caption" color="white" sx={{ px: 1 }}>
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
