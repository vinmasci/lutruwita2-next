import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { ProcessedPhoto } from '../Uploader/PhotoUploader.types';

interface PhotoPreviewModalProps {
  photo: ProcessedPhoto;
  onClose: () => void;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  photo,
  onClose
}) => {
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
          <Typography variant="h6">{photo.name}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box 
          component="img"
          src={photo.url}
          alt={photo.name}
          sx={{
            width: '100%',
            maxHeight: '70vh',
            objectFit: 'contain'
          }}
        />
        {photo.coordinates && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Location: {photo.coordinates.lat.toFixed(6)}, {photo.coordinates.lng.toFixed(6)}
            {photo.altitude && ` • Altitude: ${photo.altitude.toFixed(1)}m`}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};
