import React from 'react';
import { PhotoUploaderUIProps } from './PhotoUploader.types';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Typography
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Map as MapIcon,
  CheckCircle as SelectIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

const PhotoUploaderUI: React.FC<PhotoUploaderUIProps> = ({
  isLoading,
  error,
  photos,
  selectedPhotos,
  onFileAdd,
  onFileDelete,
  onFileRename,
  onPhotoSelect,
  onAddToMap
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif']
    },
    multiple: true,
    onDrop: acceptedFiles => onFileAdd(acceptedFiles)
  });

  return (
    <Box sx={{ pr: 2, width: '100%' }}>
      {/* Upload Area */}
      <Paper
        {...getRootProps()}
        elevation={0}
        sx={{
          p: 3,
          mb: 2,
          textAlign: 'center',
          backgroundColor: 'rgba(35, 35, 35, 0.9)',
          border: '2px dashed rgba(255, 255, 255, 0.2)',
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'rgba(45, 45, 45, 0.9)',
            border: '2px dashed rgba(255, 255, 255, 0.3)',
          }
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 48, mb: 2, opacity: 0.8 }} />
        <Typography variant="body1">
          {isDragActive
            ? 'Drop photos here...'
            : 'Drag & drop photos here or click to select'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Supports: JPG, PNG, GIF
        </Typography>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
          {error.details && (
            <Typography variant="caption" display="block">
              {error.details}
            </Typography>
          )}
        </Alert>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <Box sx={{ textAlign: 'center', my: 2 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography variant="h6">
              {photos.filter(p => p.hasGps).length} photo(s) with GPS data
            </Typography>
            <Button
              variant="contained"
              startIcon={<MapIcon />}
              disabled={!photos.some(p => p.hasGps)}
              onClick={onAddToMap}
            >
              Add to Map
            </Button>
          </Box>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {photos.map((photo) => (
              <Grid item xs={12} sm={6} key={photo.id}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1/1',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Box
                    component="img"
                    src={photo.thumbnailUrl}
                    alt={photo.name}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  
                  {/* GPS Indicator */}
                  {photo.hasGps && (
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 8,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: '50%',
                        padding: '2px',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <LocationIcon
                        sx={{
                          color: '#2ecc71',
                          fontSize: 14
                        }}
                      />
                    </Box>
                  )}

                  {/* Delete Button */}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileDelete(photo.id);
                    }}
                    sx={{ 
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      color: 'white',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      padding: '12px',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.7)'
                      }
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default PhotoUploaderUI;
