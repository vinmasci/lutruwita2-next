import React, { useState } from 'react';
import { Box, IconButton, Typography, Modal } from '@mui/material';
import { Close } from '@mui/icons-material';
import { ImageSlider } from '../ImageSlider/ImageSlider';
import { LINE_ICON_PATHS } from '../../../lineMarkers/constants/line-icons';

export const PresentationLineViewer = ({ line, onClose }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
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
            p: 4,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999
          }}
        >
          {/* Header with name and close button */}
          <Box
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 3
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
              {line.description || 'No description'}
            </Typography>
          </Box>
          
          {/* Icons */}
          {line.icons && line.icons.length > 0 && (
            <Box>
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
                  mb: 2
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
          
          {/* Photos grid removed as requested */}
        </Box>
      </Modal>
      
      {/* Photo lightbox modal */}
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
