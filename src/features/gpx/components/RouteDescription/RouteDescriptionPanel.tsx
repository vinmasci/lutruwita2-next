import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, IconButton, Snackbar, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { ProcessedRoute } from '../../../../features/map/types/route.types';
import { RichTextEditor } from './RichTextEditor';
import { ProcessedPhoto } from '../../../../features/photo/components/Uploader/PhotoUploader.types';
import { fileToProcessedPhoto, deserializePhoto, serializePhoto } from '../../../../features/photo/utils';
import { useRouteContext } from '../../../../features/map/context/RouteContext';

interface RouteDescriptionPanelProps {
  route?: ProcessedRoute;
}

export const RouteDescriptionPanel: React.FC<RouteDescriptionPanelProps> = ({
  route
}) => {
  const { updateRoute } = useRouteContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<ProcessedPhoto[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    if (route?.description) {
      setTitle(route.description.title || '');
      setDescription(route.description.description || '');
      setPhotos((route.description.photos || []).map(deserializePhoto));
    }
  }, [route]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newPhotos = Array.from(event.target.files).map(fileToProcessedPhoto);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotos(photos.filter(photo => photo.id !== photoId));
  };

  const handleSave = () => {
    if (route?.routeId) {
      updateRoute(route.routeId, {
        description: {
          title,
          description,
          photos: photos.map(serializePhoto)
        }
      });
      setShowSaveSuccess(true);
    }
  };

  const handleCloseSnackbar = () => {
    setShowSaveSuccess(false);
  };

  return (
    <>
      <Box sx={{ 
        display: 'flex', 
        height: '100%', 
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        padding: 2
      }}>
        {/* Left side - Photo section */}
        <Box sx={{ 
          width: '200px', 
          marginRight: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}>
          <Button
            component="label"
            variant="outlined"
            color="info"
            fullWidth
            sx={{ 
              backgroundColor: 'rgb(35, 35, 35)',
              borderColor: 'rgb(41, 182, 246)',
              color: 'rgb(41, 182, 246)',
              borderWidth: 2,
              '&:hover': {
                borderColor: 'rgb(41, 182, 246)',
                backgroundColor: 'rgba(41, 182, 246, 0.1)',
                borderWidth: 2
              }
            }}
          >
            Add Photos
            <input
              type="file"
              hidden
              multiple
              accept="image/*"
              onChange={handlePhotoChange}
            />
          </Button>

          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
            overflowY: 'auto',
            flex: 1
          }}>
            {photos.map((photo, index) => (
              <Box
                key={photo.id}
                sx={{
                  width: '100%',
                  aspectRatio: '1',
                  backgroundColor: 'rgb(35, 35, 35)',
                  borderRadius: 1,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <img
                  src={photo.url}
                  alt={`Upload ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <IconButton
                  onClick={() => handleDeletePhoto(photo.id)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.7)'
                    }
                  }}
                  size="small"
                >
                  <DeleteIcon sx={{ color: 'white', fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right side - Text fields */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <TextField
            label="Title"
            value={title}
            onChange={handleTitleChange}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ 
              backgroundColor: 'rgb(35, 35, 35)',
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgb(255, 255, 255)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgb(255, 255, 255)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgb(255, 255, 255)',
                }
              },
              '& .MuiInputLabel-root': {
                color: 'rgb(255, 255, 255)'
              },
              '& .MuiOutlinedInput-input': {
                color: 'rgb(255, 255, 255)'
              }
            }}
          />

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <RichTextEditor
              value={description}
              onChange={setDescription}
            />
          </Box>
          <Button
            variant="outlined"
            onClick={handleSave}
            color="info"
            sx={{
              marginTop: 'auto',
              borderColor: 'rgb(41, 182, 246)',
              color: 'rgb(41, 182, 246)',
              borderWidth: 2,
              '&:hover': {
                borderColor: 'rgb(41, 182, 246)',
                backgroundColor: 'rgba(41, 182, 246, 0.1)',
                borderWidth: 2
              }
            }}
          >
            Save Description
          </Button>
        </Box>
      </Box>
      <Snackbar
        open={showSaveSuccess}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="info" sx={{ width: '100%' }}>
          Description saved successfully
        </Alert>
      </Snackbar>
    </>
  );
};
