import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, ButtonBase } from '@mui/material';
import { StyledDrawer, DrawerHeader, DrawerContent, DrawerFooter } from '../POIDrawer/POIDrawer.styles';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
import { POI_CATEGORIES, POIIconName, POICategory } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import { PhotoPreviewModal } from '../../../photo/components/PhotoPreview/PhotoPreviewModal';
import { ProcessedPhoto } from '../../../photo/components/Uploader/PhotoUploader.types';

interface POIDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  iconName: POIIconName;
  category: POICategory;
  onSave: (details: { name: string; description: string; photos: File[] }) => void;
}

const POIDetailsDrawer: React.FC<POIDetailsDrawerProps> = ({
  isOpen,
  onClose,
  iconName,
  category,
  onSave
}) => {
  // Get the icon definition for default name
  const iconDef = getIconDefinition(iconName);
  const categoryColor = POI_CATEGORIES[category].color;

  // State for form fields
  const [name, setName] = useState(iconDef?.label || '');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ProcessedPhoto | null>(null);

  // Reset form when drawer opens with new POI
  useEffect(() => {
    if (isOpen) {
      setName(iconDef?.label || '');
      setDescription('');
      setPhotos([]);
    }
  }, [isOpen, iconDef]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setPhotos(Array.from(event.target.files));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      photos
    });
  };

  return (
    <NestedDrawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      variant="persistent"
      sx={{
        zIndex: 1300 // Higher than POIDrawer
      }}
    >
      <StyledDrawer>
        <DrawerHeader>
          <Typography variant="h6">Add POI Details</Typography>
        </DrawerHeader>

        <DrawerContent>
          <form onSubmit={handleSubmit} style={{ height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            {/* Icon preview */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              backgroundColor: 'rgb(45, 45, 45)',
              padding: '12px',
              borderRadius: '4px'
            }}>
              <i 
                className={iconDef?.name} 
                style={{ 
                  color: categoryColor,
                  fontSize: '24px' 
                }} 
              />
              <Typography variant="body2" color="text.secondary">
                {POI_CATEGORIES[category].label}
              </Typography>
            </Box>

            {/* Name field */}
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

            {/* Description field */}
            <TextField
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={4}
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

            {/* Photo upload */}
            <Button
              component="label"
              variant="outlined"
              fullWidth
              sx={{ 
                backgroundColor: 'rgb(35, 35, 35)',
                borderColor: 'rgb(255, 255, 255)',
                color: 'rgb(255, 255, 255)',
                '&:hover': {
                  borderColor: 'rgb(255, 255, 255)',
                  backgroundColor: 'rgb(45, 45, 45)'
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

            {/* Photo preview */}
            {photos.length > 0 && (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1 
              }}>
                {photos.map((photo, index) => (
                  <ButtonBase
                    key={index}
                    onClick={() => {
                      const url = URL.createObjectURL(photo);
                      const processedPhoto: ProcessedPhoto = {
                        id: String(index),
                        name: photo.name || `Photo ${index + 1}`,
                        url: url,
                        thumbnailUrl: url,
                        dateAdded: new Date(),
                        hasGps: false
                      };
                      setSelectedPhoto(processedPhoto);
                    }}
                    sx={{
                      display: 'block',
                      width: '100%',
                      aspectRatio: '1',
                      backgroundColor: 'rgb(35, 35, 35)',
                      borderRadius: 1,
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Upload ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </ButtonBase>
                ))}
              </Box>
            )}

              {/* Action buttons */}
              <DrawerFooter>
                <Button
                  variant="text"
                  onClick={onClose}
                  fullWidth
                  sx={{ color: 'white' }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{ 
                    backgroundColor: POI_CATEGORIES[category].color,
                    '&:hover': {
                      backgroundColor: POI_CATEGORIES[category].color
                    }
                  }}
                >
                  Save
                </Button>
              </DrawerFooter>
            </Box>
          </form>
        </DrawerContent>
      </StyledDrawer>
      {selectedPhoto && (
        <PhotoPreviewModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </NestedDrawer>
  );
};

export default POIDetailsDrawer;
