import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Modal,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardMedia,
  CardContent,
  Rating, // For star ratings
  Divider,
  Link
} from '@mui/material';
import { Close, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { ImageSlider } from '../ImageSlider/ImageSlider';
import { LINE_ICON_PATHS } from '../../../lineMarkers/constants/line-icons';

// Helper to render star rating
const renderRating = (rating) => {
  if (rating === null || rating === undefined) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
      <Rating value={rating} precision={0.1} readOnly size="small" />
      <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
        ({rating.toFixed(1)})
      </Typography>
    </Box>
  );
};

export const PresentationLineViewer = ({
  line,
  onClose,
  isLoadingDetails, // Renamed prop
  placeDetails      // Renamed prop
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Log received props for debugging
  // console.log('[PresentationLineViewer] Received props:', {
  //   lineId: line?.id,
  //   isLoadingDetails, // Use renamed prop in log
  //   placeDetails      // Use renamed prop in log
  // });

  if (!line) return null;

  // Prepare photos for the image slider
  const photos = line.photos || [];

  // Create mapPreviewProps for the ImageSlider
  const mapPreviewProps = {
    center: line.coordinates?.start, // Use the line's start coordinates as center
    zoom: 14, // Default zoom level
    routes: [] // No routes to display
  };

  return (
    <>
      {/* Main modal with line details */}
      <Modal
        open={Boolean(line)}
        onClose={onClose}
        aria-labelledby="line-viewer-modal"
        disableScrollLock={true}
        disableAutoFocus={true}
        keepMounted={true}
        sx={{
          zIndex: 9999,
          // Ensure modal doesn't affect other fixed elements
          '& .MuiBackdrop-root': {
            position: 'absolute'
          }
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            bgcolor: 'rgba(35, 35, 35, 0.95)',
            border: '1px solid rgba(30, 136, 229, 0.5)',
            borderRadius: 2,
            boxShadow: 24,
            // p: 4, // Padding moved to inner boxes
            // overflowY: 'auto', // Moved to inner content box
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            color: 'white' // Ensure default text color is white
          }}
        >
          {/* Header with name and close button - Add padding here */}
          <Box
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              p: 4, // Add padding to header
              pb: 2 // Reduce bottom padding for header
              // mb: 3 // Remove bottom margin, handle spacing with content box
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" color="white">{line.name}</Typography>
            </Box>
            <IconButton
              onClick={onClose}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <Close />
            </IconButton>
          </Box>

          {/* Scrollable Content Area */}
          <Box sx={{ overflowY: 'auto', flexGrow: 1, p: 4, pt: 0 }}>
            {/* Image slider - always show regardless of photos */}
            <Box
              sx={{
              height: '250px',
              mb: 3,
              position: 'relative',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            <ImageSlider
              photos={photos}
              maxPhotos={10}
              mapPreviewProps={mapPreviewProps}
              alwaysShowMap={true} // Always show the map preview
            />
          </Box>

          {/* Description */}
          {line.description && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: '4px',
                backgroundColor: 'rgba(45, 45, 45, 0.9)',
              }}
            >
              <Typography
                variant="body1"
                color="white"
                sx={{ whiteSpace: 'pre-wrap' }}
              >
                {line.description}
              </Typography>
            </Box>
          )}

          {/* Icons */}
          {line.icons && line.icons.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                color="white"
                sx={{ mb: 1 }}
              >
                Features
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                {line.icons.map(icon => (
                  <Box
                    key={icon}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(45, 45, 45, 0.9)',
                      borderRadius: '4px',
                      padding: '8px',
                      width: '50px',
                      height: '50px'
                    }}
                  >
                    <i
                      className={LINE_ICON_PATHS[icon]}
                      style={{
                        fontSize: '24px',
                        color: 'white'
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Town Info and Hotels Section */}
          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

          {/* Use renamed isLoadingDetails prop */}
          {isLoadingDetails ? ( 
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress color="inherit" size={24} />
            </Box>
          ) : (
            <>
              {/* Quick Facts */}
              {/* Use renamed placeDetails prop */}
              {placeDetails && ( 
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" color="white" gutterBottom>
                    {/* Use placeDetails.name which should match line.name */}
                    Quick facts about {placeDetails.name} 
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '4px',
                      backgroundColor: 'rgba(45, 45, 45, 0.9)', 
                    }}
                  >
                    <Typography variant="body2" color="white" sx={{ whiteSpace: 'pre-wrap' }}>
                      {/* Use placeDetails.summary */}
                      {placeDetails.summary} 
                    </Typography>
                  </Box>
                </Box>
              )}
              {/* Removed extra closing Box tag here */}
              {/* Hotels section removed */}
            </>
          )}
          </Box> {/* End Scrollable Content Area */}
        </Box>
      </Modal>

      {/* Photo lightbox modal (remains unchanged) */}
      <Modal
        open={Boolean(selectedPhoto)}
        onClose={() => setSelectedPhoto(null)}
        disableScrollLock={true}
        disableAutoFocus={true}
        keepMounted={true}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000, // Higher than the line viewer modal
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            position: 'absolute'
          }
        }}
      >
        <Box
          sx={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            outline: 'none'
          }}
        >
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Full size photo"
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain'
              }}
            />
          )}
          <IconButton
            onClick={() => setSelectedPhoto(null)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)'
              }
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </Modal>
    </>
  );
};

export default PresentationLineViewer;
