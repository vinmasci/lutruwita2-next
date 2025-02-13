import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Stack
} from '@mui/material';
import { 
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon
} from '@mui/icons-material';
import { ProcessedPhoto } from '../Uploader/PhotoUploader.types';

interface PhotoPreviewModalProps {
  photo: ProcessedPhoto;
  onClose: () => void;
  additionalPhotos?: ProcessedPhoto[] | null;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  photo,
  onClose,
  additionalPhotos
}) => {
  const photos = additionalPhotos || [photo];
  const currentIndex = photos.findIndex(p => p.id === photo.id);
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const selectedPhoto = photos[selectedIndex];
  return (
    <Dialog
      open={true}
      onClose={onClose}
      fullScreen={false}
      maxWidth={false}
      fullWidth={false}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'center',
          justifyContent: 'center',
          '& .MuiPaper-root': {
            width: '800px',
            maxWidth: '80%',
            m: 2,
            borderRadius: 1
          }
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{selectedPhoto.name}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box position="relative">
          <Box 
            component="img"
            src={selectedPhoto.url}
            alt={selectedPhoto.name}
            sx={{
              width: '100%',
              maxHeight: '70vh',
              objectFit: 'contain'
            }}
          />
          {photos.length > 1 && (
            <>
              <IconButton
                onClick={handlePrev}
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)'
                  }
                }}
              >
                <PrevIcon />
              </IconButton>
              <IconButton
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)'
                  }
                }}
              >
                <NextIcon />
              </IconButton>
            </>
          )}
        </Box>
        {selectedPhoto.coordinates && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Location: {selectedPhoto.coordinates.lat.toFixed(6)}, {selectedPhoto.coordinates.lng.toFixed(6)}
            {selectedPhoto.altitude && ` • Altitude: ${selectedPhoto.altitude.toFixed(1)}m`}
          </Typography>
        )}
        {photos.length > 1 && (
          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              mt: 2,
              overflowX: 'auto',
              pb: 1
            }}
          >
            {photos.map((p, index) => (
              <Box
                key={p.id}
                component="img"
                src={p.thumbnailUrl}
                alt={p.name}
                onClick={() => setSelectedIndex(index)}
                sx={{
                  width: 60,
                  height: 60,
                  objectFit: 'cover',
                  cursor: 'pointer',
                  borderRadius: 1,
                  border: index === selectedIndex ? '2px solid #4AA4DE' : '2px solid transparent',
                  '&:hover': {
                    opacity: 0.8
                  }
                }}
              />
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};
