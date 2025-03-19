import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField, 
  Button, 
  Box, 
  Typography, 
  ButtonBase,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import { PhotoPreviewModal } from '../../../photo/components/PhotoPreview/PhotoPreviewModal';

const POIDetailsModal = ({ isOpen, onClose, iconName, category, onSave, readOnly = false }) => {
  // Get the icon definition for default name
  const iconDef = getIconDefinition(iconName);
  
  // Add fallback color in case the category doesn't exist in POI_CATEGORIES
  const categoryColor = POI_CATEGORIES[category]?.color || '#777777'; // Default gray color if category not found
  
  // State for form fields
  const [name, setName] = useState(iconDef?.label || '');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
  // Reset form when modal opens with new POI
  useEffect(() => {
    if (isOpen) {
      setName(iconDef?.label || '');
      setDescription('');
      setPhotos([]);
    }
  }, [isOpen, iconDef]);
  
  const handlePhotoChange = (event) => {
    if (event.target.files) {
      setPhotos(Array.from(event.target.files));
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      description,
      photos
    });
  };
  
  return (
    <>
      <Dialog 
        open={isOpen} 
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        disableScrollLock={true}
        disableAutoFocus={true}
        keepMounted={true}
        PaperProps={{
          style: {
            backgroundColor: 'rgba(35, 35, 35, 0.8)',
            color: 'white'
          }
        }}
        sx={{
          '& .MuiBackdrop-root': {
            position: 'absolute'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" color="white">Add POI Details</Typography>
            <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <form onSubmit={handleSubmit} style={{ height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'rgb(45, 45, 45)',
                padding: '12px',
                borderRadius: '4px'
              }}>
                <i className={iconDef?.name} style={{
                  color: categoryColor,
                  fontSize: '24px'
                }} />
                <Typography variant="body2" color="white">
                  {POI_CATEGORIES[category]?.label || 'Unknown Category'}
                </Typography>
              </Box>
              
              <TextField 
                label="Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                fullWidth 
                variant="outlined" 
                size="small"
                disabled={readOnly}
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
              
              <TextField 
                label="Description (optional)" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                multiline 
                rows={4} 
                fullWidth 
                variant="outlined" 
                size="small"
                disabled={readOnly}
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
              
              {!readOnly && (
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
              )}
              
              {photos.length > 0 && (
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1
                }}>
                  {photos.map((photo, index) => (
                    <ButtonBase 
                      key={index}
                      onClick={() => {
                        const url = URL.createObjectURL(photo);
                        const processedPhoto = {
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
            </Box>
          </form>
        </DialogContent>
        
        <DialogActions sx={{ padding: '16px' }}>
          <Button 
            variant="text" 
            onClick={onClose} 
            sx={{ color: 'white' }}
          >
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button 
              onClick={handleSubmit}
              variant="contained" 
              sx={{
                backgroundColor: POI_CATEGORIES[category]?.color || '#777777',
                '&:hover': {
                  backgroundColor: POI_CATEGORIES[category]?.color || '#777777'
                }
              }}
            >
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {selectedPhoto && (
        <PhotoPreviewModal 
          photo={selectedPhoto} 
          onClose={() => setSelectedPhoto(null)} 
        />
      )}
    </>
  );
};

export default POIDetailsModal;
