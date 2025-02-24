import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, IconButton, Snackbar, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { ProcessedRoute } from '../../../../features/map/types/route.types';
import { RichTextEditor } from './RichTextEditor.js';
import { ProcessedPhoto } from '../../../../features/photo/components/Uploader/PhotoUploader.types';
import { fileToProcessedPhoto, deserializePhoto, serializePhoto } from '../../../../features/photo/utils';
import { useRouteContext } from '../../../../features/map/context/RouteContext.js';
import { usePhotoService } from '../../../../features/photo/services/photoService';

interface PhotoWithFile extends ProcessedPhoto {
  file?: File;
}

interface RouteDescriptionPanelProps {
  route?: ProcessedRoute;
}

interface RouteDescription {
  title: string;
  description: string;
  photos: ProcessedPhoto[];
}

export const RouteDescriptionPanel: React.FC<RouteDescriptionPanelProps> = ({
  route
}) => {
  const { updateRoute, routes } = useRouteContext();
  const photoService = usePhotoService();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [photos, setPhotos] = useState<PhotoWithFile[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Keep local state in sync with route changes
  useEffect(() => {
    console.debug('[RouteDescriptionPanel] Route description changed:', {
      hasRoute: !!route,
      hasDescription: !!route?.description,
      title: route?.description?.title,
      descriptionLength: route?.description?.description?.length || 0
    });

    if (route?.description) {
      setTitle(route.description.title ?? '');
      setDescription(route.description.description ?? '');
      setPhotos((route.description.photos || []).map(deserializePhoto));
    }
  }, [route?.description]);

  // Debounced update to route
  useEffect(() => {
    if (!route?.routeId) return;

    const currentRoute = routes.find(r => r.routeId === route.routeId);
    if (!currentRoute) return;

    const hasChanges = 
      currentRoute.description?.title !== title || 
      currentRoute.description?.description !== description ||
      currentRoute.description?.photos?.length !== photos.length;

    if (hasChanges) {
      console.debug('[RouteDescriptionPanel] Updating route with new description:', {
        routeId: route.routeId,
        title,
        descriptionLength: description?.length || 0,
        photoCount: photos.length
      });

      const timeoutId = setTimeout(() => {
        const routeId = route.routeId as string;
        const updates: Partial<ProcessedRoute> = {
          description: {
            title: title ?? '',
            description: description ?? '',
            photos: photos.map(serializePhoto)
          }
        };
        updateRoute(routeId, updates);
      }, 500); // Debounce updates

      return () => clearTimeout(timeoutId);
    }
  }, [title, description, photos, route?.routeId, routes, updateRoute]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newPhotos = Array.from(event.target.files).map(file => ({
        ...fileToProcessedPhoto(file),
        file
      }));
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotos(photos.filter(photo => photo.id !== photoId));
  };

  const handleSave = async () => {
    if (!route?.routeId) return;
    
    try {
      setIsSaving(true);

      // Upload any new photos that have File objects
      const uploadPromises = photos
        .filter(photo => photo.file)
        .map(async photo => {
          if (!photo.file) return photo;
          
          const result = await photoService.uploadPhoto(photo.file);
          return {
            ...photo,
            url: result.url,
            thumbnailUrl: result.thumbnailUrl,
            file: undefined // Clear the file after upload
          };
        });

      const uploadedPhotos = await Promise.all(uploadPromises);

      // Update photos array with uploaded photos
      const updatedPhotos = photos.map(photo => {
        const uploaded = uploadedPhotos.find(up => up.id === photo.id);
        return uploaded || photo;
      });

      // Update route with new description including uploaded photos
      const routeId = route.routeId as string;
      const updates: Partial<ProcessedRoute> = {
        description: {
          title: title ?? '',
          description: description ?? '',
          photos: updatedPhotos.map(serializePhoto)
        }
      };
      await updateRoute(routeId, updates);

      setPhotos(updatedPhotos);
      setShowSaveSuccess(true);
    } catch (error) {
      console.error('[RouteDescriptionPanel] Failed to save:', error);
    } finally {
      setIsSaving(false);
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
            disabled={isSaving}
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
            {isSaving ? 'Saving...' : 'Save Description'}
          </Button>
        </Box>
      </Box>
      <Snackbar
        open={showSaveSuccess}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="info" sx={{ width: '100%' }} component="div">
          Description saved successfully
        </Alert>
      </Snackbar>
    </>
  );
};
