import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
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
 * A presentation-focused lightbox component for displaying photos
 * Features:
 * - Full-screen image display
 * - Navigation arrows overlaid on the image
 * - Map pans to the location of the current photo
 * - No thumbnail strip
 * 
 * @param {Object} props - Component props
 * @param {Object} props.photo - The photo to display
 * @param {Function} props.onClose - Function to call when closing the lightbox
 * @param {Array} props.additionalPhotos - Optional array of additional photos for navigation
 */
export const PresentationLightbox = ({ photo, onClose, additionalPhotos }) => {
  // Get map context for panning
  const { map } = useMapContext();
  
  // Use all photos if provided, otherwise just the single photo
  const photos = additionalPhotos || [photo];
  
  // Find the index of the current photo
  const initialIndex = photos.findIndex(p => p.id === photo.id);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [imageError, setImageError] = useState(false);
  
  // Local state to track photos
  const [localPhotos, setLocalPhotos] = useState(photos);
  
  // Update local photos when props change
  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);
  
  // Get the currently selected photo
  const selectedPhoto = localPhotos[selectedIndex];
  
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
        duration: 1000 // Smooth transition over 1 second
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
        duration: 1000 // Smooth transition over 1 second
      });
    }
  }, [localPhotos, selectedIndex, map]);
  
  // Pan to the initial photo when the lightbox opens
  useEffect(() => {
    if (map && selectedPhoto && selectedPhoto.coordinates) {
      map.easeTo({
        center: [selectedPhoto.coordinates.lng, selectedPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        duration: 1000 // Smooth transition over 1 second
      });
    }
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
  
  // Determine the best image URL to use
  const getBestImageUrl = (photo) => {
    // For local photos, prefer the largest available size
    if (photo.isLocal) {
      return photo.url || photo.mediumUrl || photo.thumbnailUrl || photo.tinyThumbnailUrl;
    }
    
    // For Cloudinary photos, prefer optimized sizes
    return photo.largeUrl || photo.mediumUrl || photo.url || photo.thumbnailUrl || photo.tinyThumbnailUrl;
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
    <Dialog 
      open={true} 
      onClose={onClose} 
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'black',
          borderRadius: 0, // No rounded corners for a more immersive feel
          overflow: 'hidden',
          maxHeight: '100vh',
          maxWidth: '100vw',
          width: '100%',
          height: '100%',
          m: 0 // No margin
        }
      }}
    >
      {/* Main image container - takes up the full dialog */}
      <Box 
        position="relative" 
        display="flex"
        justifyContent="center"
        alignItems="center"
        bgcolor="black"
        height="100vh"
        width="100vw"
        overflow="hidden"
      >
        {/* Close button - positioned in the top-right corner */}
        <IconButton 
          onClick={onClose} 
          size="large" 
          aria-label="close"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.7)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
        
        {/* Image */}
        {!imageError ? (
          <img
            src={getBestImageUrl(selectedPhoto)}
            alt={selectedPhoto.name || 'Photo'}
            onError={handleImageError}
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain'
            }}
          />
        ) : (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center"
            p={4}
            color="white"
          >
            <img 
              src="/images/photo-fallback.svg" 
              alt="Failed to load" 
              style={{ width: 100, height: 100, marginBottom: 16 }} 
            />
            <Typography variant="body1">
              Failed to load image
            </Typography>
          </Box>
        )}
        
        {/* Navigation buttons - larger and more prominent */}
        {localPhotos.length > 1 && (
          <>
            <IconButton
              onClick={handlePrev}
              sx={{
                position: 'absolute',
                left: 16,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: 2,
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.7)'
                }
              }}
              aria-label="previous photo"
              size="large"
            >
              <PrevIcon fontSize="large" />
            </IconButton>
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 16,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: 2,
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.7)'
                }
              }}
              aria-label="next photo"
              size="large"
            >
              <NextIcon fontSize="large" />
            </IconButton>
          </>
        )}
        
        {/* Photo info overlay - positioned at the bottom */}
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          bgcolor="rgba(0,0,0,0.7)"
          color="white"
          p={2}
          sx={{
            transition: 'opacity 0.3s ease',
            opacity: 0.7,
            '&:hover': {
              opacity: 1
            }
          }}
        >
          <Typography variant="h6">
            {selectedPhoto.name || 'Untitled Photo'}
          </Typography>
          {selectedPhoto.coordinates && (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Location: {selectedPhoto.coordinates.lat.toFixed(6)}, {selectedPhoto.coordinates.lng.toFixed(6)}
              {selectedPhoto.altitude && ` • Altitude: ${selectedPhoto.altitude.toFixed(1)}m`}
            </Typography>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};

export default PresentationLightbox;
