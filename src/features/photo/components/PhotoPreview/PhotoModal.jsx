import React, { useState, useEffect, useCallback } from 'react';
import { 
  Paper, 
  IconButton, 
  Typography, 
  Box,
  Button,
  TextField,
  InputAdornment
} from '@mui/material';
import { 
  Close as CloseIcon, 
  NavigateNext as NextIcon, 
  NavigateBefore as PrevIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../context/PhotoContext';

/**
 * An enhanced modal component for displaying photos in creation mode
 * Features:
 * - Shows photos in a fixed-position modal with improved styling
 * - Navigation arrows to cycle through nearby photos
 * - Map pans to the location of the current photo with 3D perspective
 * - Photos ordered by route position
 * 
 * @param {Object} props - Component props
 * @param {Object} props.photo - The photo to display
 * @param {Function} props.onClose - Function to call when closing the lightbox
 * @param {Array} props.additionalPhotos - Optional array of additional photos for navigation
 * @param {number} props.initialIndex - Initial index of the photo in the additionalPhotos array
 * @param {Function} props.onPhotoChange - Function to call when changing photos
 * @param {Function} props.onDelete - Optional function to call when deleting a photo
 * @param {boolean} props.disableDelete - Optional flag to disable the delete button
 */
export const PhotoModal = ({ 
  photo, 
  onClose, 
  additionalPhotos, 
  initialIndex = 0, 
  onPhotoChange,
  onDelete,
  disableDelete = false
}) => {
  // Get map context for panning
  const { map } = useMapContext();
  
  // Use all photos if provided, otherwise just the single photo
  const photos = additionalPhotos || [photo];
  
  // Use the initialIndex prop to set the initial selectedIndex
  const [selectedIndex, setSelectedIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [imageError, setImageError] = useState(false);
  
  // Local state to track photos after deletion
  const [localPhotos, setLocalPhotos] = useState(photos);
  const [caption, setCaption] = useState('');
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  
  // Get the photo context for operations
  const { deletePhoto, updatePhoto } = usePhotoContext();
  
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
  
  // Initialize caption when selected photo changes
  useEffect(() => {
    if (selectedPhoto) {
      setCaption(selectedPhoto.caption || '');
      setIsEditingCaption(false);
    }
  }, [selectedPhoto]);
  
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
  
  // Delete handler
  const handleDelete = useCallback(() => {
    if (selectedPhoto) {
      console.log('[PhotoModal] Deleting photo:', selectedPhoto.name);
      console.log('[PhotoModal] Selected photo URL:', selectedPhoto.url);
      console.log('[PhotoModal] Local photos before deletion:', localPhotos.length);
      
      // Call the context delete function with URL instead of ID
      console.log('[PhotoModal] Calling PhotoContext.deletePhoto with URL:', selectedPhoto.url);
      deletePhoto(selectedPhoto.url);
      
      // Call the provided onDelete if available
      if (onDelete) {
        // If onDelete expects an ID, pass the URL as a fallback
        console.log('[PhotoModal] Calling provided onDelete callback');
        onDelete(selectedPhoto.id || selectedPhoto.url);
      }
      
      // Update local photos state to reflect the deletion
      // Use URL for comparison since IDs might be undefined
      const newPhotos = localPhotos.filter(p => p.url !== selectedPhoto.url);
      console.log('[PhotoModal] Local photos after deletion:', newPhotos.length);
      console.log('[PhotoModal] Remaining photo URLs:', newPhotos.map(p => p.url));
      setLocalPhotos(newPhotos);
      
      // If there are more photos, navigate to the next one, otherwise close
      if (newPhotos.length > 0) {
        // If we're at the last photo, go to the previous one
        if (selectedIndex >= newPhotos.length) {
          console.log('[PhotoModal] Adjusting selectedIndex to:', newPhotos.length - 1);
          setSelectedIndex(newPhotos.length - 1);
        } else {
          console.log('[PhotoModal] Keeping selectedIndex at:', selectedIndex);
        }
        // Otherwise, stay at the same index (which will now show the next photo)
      } else {
        // If this was the only photo, close the lightbox
        console.log('[PhotoModal] No photos left, closing lightbox');
        onClose();
      }
    }
  }, [selectedPhoto, deletePhoto, onDelete, localPhotos, selectedIndex, onClose]);
  
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
              objectFit: 'cover', // Fill the frame, cropping if necessary
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
      
      {/* Caption input or display */}
      <Box 
        sx={{
          p: 1.5, 
          bgcolor: "rgba(0,0,0,0.5)",
          borderTop: "1px solid rgba(255,255,255,0.1)"
        }}
      >
        {isEditingCaption ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255,255,255,0.7)',
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={() => {
                        // Save the caption
                        if (selectedPhoto) {
                          // Update the photo in context
                          updatePhoto(selectedPhoto.url, { caption });
                          
                          // Update the local photos array
                          const updatedPhotos = localPhotos.map(p => 
                            p.url === selectedPhoto.url ? { ...p, caption } : p
                          );
                          setLocalPhotos(updatedPhotos);
                          
                          // Exit editing mode
                          setIsEditingCaption(false);
                        }
                      }}
                      edge="end"
                      sx={{ color: 'white' }}
                    >
                      <SaveIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Save the caption on Enter key
                  if (selectedPhoto) {
                    updatePhoto(selectedPhoto.url, { caption });
                    const updatedPhotos = localPhotos.map(p => 
                      p.url === selectedPhoto.url ? { ...p, caption } : p
                    );
                    setLocalPhotos(updatedPhotos);
                    setIsEditingCaption(false);
                  }
                } else if (e.key === 'Escape') {
                  // Cancel editing on Escape key
                  setCaption(selectedPhoto?.caption || '');
                  setIsEditingCaption(false);
                }
              }}
            />
          </Box>
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              minHeight: '40px'
            }}
          >
            <Typography 
              variant="body2" 
              color="white"
              sx={{ 
                flex: 1,
                fontStyle: caption ? 'normal' : 'italic',
                opacity: caption ? 1 : 0.7
              }}
            >
              {caption || "No caption"}
            </Typography>
            <IconButton 
              onClick={() => setIsEditingCaption(true)}
              size="small"
              sx={{ color: 'white' }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>
      
      {/* Footer with photo count, route info, and delete button */}
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
        
        {/* Delete button (right side) */}
        {!disableDelete && (
          <Button
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            color="error"
            variant="outlined"
            size="small"
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
          >
            Delete
          </Button>
        )}
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
