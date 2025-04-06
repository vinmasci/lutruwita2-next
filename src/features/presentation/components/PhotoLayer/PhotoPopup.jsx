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
 * A small popup component for displaying photos near their markers
 * Features:
 * - Small image display positioned to the top-right of the marker
 * - Navigation arrows to cycle through nearby photos
 * - Map pans to the location of the current photo
 * 
 * @param {Object} props - Component props
 * @param {Object} props.photo - The photo to display
 * @param {Function} props.onClose - Function to call when closing the popup
 * @param {Array} props.additionalPhotos - Optional array of additional photos for navigation
 */
export const PhotoPopup = ({ photo, onClose, additionalPhotos }) => {
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
        duration: 500 // Smooth transition over 0.5 seconds
      });
    }
  }, [localPhotos, selectedIndex, map]);
  
  // Pan to the initial photo when the popup opens
  useEffect(() => {
    if (map && selectedPhoto && selectedPhoto.coordinates) {
      map.easeTo({
        center: [selectedPhoto.coordinates.lng, selectedPhoto.coordinates.lat],
        zoom: map.getZoom(), // Maintain current zoom level
        duration: 500 // Smooth transition over 0.5 seconds
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
    // For local photos, prefer medium or thumbnail size for the popup
    if (photo.isLocal) {
      return photo.mediumUrl || photo.thumbnailUrl || photo.url || photo.tinyThumbnailUrl;
    }
    
    // For Cloudinary photos, prefer optimized sizes
    return photo.mediumUrl || photo.thumbnailUrl || photo.url || photo.largeUrl || photo.tinyThumbnailUrl;
  };
  
  // Handle image loading error
  const handleImageError = () => {
    console.error('Failed to load image:', getBestImageUrl(selectedPhoto));
    setImageError(true);
  };
  
  if (!selectedPhoto) {
    return null;
  }
  
  // Calculate the position for the popup
  // We want it to appear to the top-right of the marker
  // The marker is at the center of the map, so we need to position the popup
  // in the DOM using absolute positioning
  
  return (
    <Paper
      elevation={8}
      sx={{
        position: 'absolute', // Use absolute positioning relative to the map container
        top: '50%', // Position at the center of the map
        left: '50%', // Position at the center of the map
        transform: 'translate(0, -50px)', // Offset just slightly above the marker
        width: 250, // Smaller width to be less intrusive
        maxWidth: '80vw',
        zIndex: 9999, // Very high z-index to ensure it's on top
        overflow: 'hidden',
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)', // More prominent shadow
        border: '3px solid red' // Red border to make it extremely visible
      }}
    >
      {/* Header with title and close button */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        p={1}
        borderBottom="1px solid"
        borderColor="divider"
        bgcolor="primary.main"
        color="primary.contrastText"
      >
        <Typography variant="subtitle2" noWrap sx={{ maxWidth: 200 }}>
          {selectedPhoto.name || 'Photo'}
        </Typography>
        <IconButton 
          onClick={onClose} 
          size="small" 
          aria-label="close"
          sx={{ color: 'inherit' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      
      {/* Main image container */}
      <Box 
        position="relative" 
        display="flex"
        justifyContent="center"
        alignItems="center"
        bgcolor="black"
        height={150} // Smaller height to make it less intrusive
        overflow="hidden"
      >
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
            p={2}
            color="white"
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
      
      {/* Footer with photo info */}
      <Box 
        p={1} 
        borderTop="1px solid" 
        borderColor="divider"
        bgcolor="background.paper"
      >
        <Typography variant="caption" display="block" color="text.secondary">
          {selectedIndex + 1} of {localPhotos.length} photos
        </Typography>
        {selectedPhoto.coordinates && (
          <Typography variant="caption" display="block" color="text.secondary" noWrap>
            {selectedPhoto.coordinates.lat.toFixed(6)}, {selectedPhoto.coordinates.lng.toFixed(6)}
            {selectedPhoto.altitude && ` • ${selectedPhoto.altitude.toFixed(1)}m`}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default PhotoPopup;
