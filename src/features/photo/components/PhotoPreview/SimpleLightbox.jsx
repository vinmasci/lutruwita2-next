import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  IconButton, 
  Typography, 
  Box, 
  Stack,
  Button
} from '@mui/material';
import { 
  Close as CloseIcon, 
  NavigateNext as NextIcon, 
  NavigateBefore as PrevIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { usePhotoContext } from '../../context/PhotoContext';

/**
 * A simple lightbox component for displaying photos
 * @param {Object} props - Component props
 * @param {Object} props.photo - The photo to display
 * @param {Function} props.onClose - Function to call when closing the lightbox
 * @param {Array} props.additionalPhotos - Optional array of additional photos for navigation
 * @param {Function} props.onDelete - Optional function to call when deleting a photo
 */
export const SimpleLightbox = ({ photo, onClose, additionalPhotos, onDelete }) => {
  // Use all photos if provided, otherwise just the single photo
  const photos = additionalPhotos || [photo];
  
  // Find the index of the current photo
  const initialIndex = photos.findIndex(p => p.id === photo.id);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [imageError, setImageError] = useState(false);
  
  // Get the currently selected photo
  const selectedPhoto = photos[selectedIndex];
  
  // Get the photo context for potential delete operations
  const { deletePhoto } = usePhotoContext();
  
  // Navigation handlers
  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % photos.length);
    setImageError(false); // Reset error state when changing photos
  }, [photos.length]);
  
  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setImageError(false); // Reset error state when changing photos
  }, [photos.length]);
  
  // Delete handler
  const handleDelete = useCallback(() => {
    if (selectedPhoto) {
      // Call the context delete function
      deletePhoto(selectedPhoto.id);
      
      // Call the provided onDelete if available
      if (onDelete) {
        onDelete(selectedPhoto.id);
      }
      
      // If there are more photos, navigate to the next one, otherwise close
      if (photos.length > 1) {
        // If we're at the last photo, go to the previous one
        if (selectedIndex === photos.length - 1) {
          handlePrev();
        } else {
          // Otherwise, stay at the same index (which will now show the next photo)
          const newPhotos = photos.filter(p => p.id !== selectedPhoto.id);
          if (newPhotos.length === 0) {
            onClose();
          }
        }
      } else {
        // If this was the only photo, close the lightbox
        onClose();
      }
    }
  }, [selectedPhoto, deletePhoto, onDelete, photos, selectedIndex, handlePrev, onClose]);
  
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
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 3, // Increased from 1 to 3 for more rounded corners
          overflow: 'hidden',
          maxHeight: '90vh',
          maxWidth: '90vw',
          width: 'auto',
          m: 2
        }
      }}
    >
      {/* Header with title and close button */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        p={2}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <Typography variant="h6" component="h2">
          {selectedPhoto.name}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </Box>
      
      {/* Main image container */}
      <Box 
        position="relative" 
        display="flex"
        justifyContent="center"
        alignItems="center"
        bgcolor="black"
        height="60vh"
        overflow="hidden"
      >
        {/* Image */}
        {!imageError ? (
          <img
            src={getBestImageUrl(selectedPhoto)}
            alt={selectedPhoto.name}
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
        
        {/* Navigation buttons */}
        {photos.length > 1 && (
          <>
            <IconButton
              onClick={handlePrev}
              sx={{
                position: 'absolute',
                left: 16,
                bgcolor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.5)'
                }
              }}
              aria-label="previous photo"
            >
              <PrevIcon />
            </IconButton>
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 16,
                bgcolor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.5)'
                }
              }}
              aria-label="next photo"
            >
              <NextIcon />
            </IconButton>
          </>
        )}
      </Box>
      
      {/* Footer with metadata and actions */}
      <Box p={2} borderTop="1px solid" borderColor="divider">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {/* Location info */}
          <Box>
            {selectedPhoto.coordinates && (
              <Typography variant="body2" color="text.secondary">
                Location: {selectedPhoto.coordinates.lat.toFixed(6)}, {selectedPhoto.coordinates.lng.toFixed(6)}
                {selectedPhoto.altitude && ` • Altitude: ${selectedPhoto.altitude.toFixed(1)}m`}
              </Typography>
            )}
          </Box>
          
          {/* Actions */}
          <Box>
            <Button
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              color="error"
              variant="outlined"
              size="small"
            >
              Delete
            </Button>
          </Box>
        </Stack>
        
        {/* Thumbnails for navigation */}
        {photos.length > 1 && (
          <Stack 
            direction="row" 
            spacing={1} 
            mt={2}
            sx={{
              overflowX: 'auto',
              pb: 1,
              '&::-webkit-scrollbar': {
                height: 6
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: 3
              }
            }}
          >
            {photos.map((p, index) => (
              <Box
                key={p.id}
                onClick={() => {
                  setSelectedIndex(index);
                  setImageError(false);
                }}
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: 2, // Increased from 1 to 2 for more rounded corners on thumbnails
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: index === selectedIndex ? '2px solid #4AA4DE' : '2px solid transparent',
                  opacity: index === selectedIndex ? 1 : 0.7,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    opacity: 1
                  }
                }}
              >
                <img
                  src={p.thumbnailUrl || p.tinyThumbnailUrl || p.url}
                  alt={p.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.src = '/images/photo-fallback.svg';
                    e.target.style.objectFit = 'contain';
                    e.target.style.padding = '8px';
                  }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Dialog>
  );
};

export default SimpleLightbox;
