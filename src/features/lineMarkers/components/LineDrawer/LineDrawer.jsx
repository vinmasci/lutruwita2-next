import React, { useState, useEffect } from 'react';
import {
  Drawer,
  TextField,
  IconButton,
  Typography,
  Box,
  Button,
  Divider,
  ButtonBase
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import { useLineContext } from '../../context/LineContext.jsx';
import LineIconSelection from './LineIconSelection.jsx';
import { PhotoPreviewModal } from '../../../photo/components/PhotoPreview/PhotoPreviewModal';

const LineDrawer = ({ 
  isOpen, 
  onClose, 
  line,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcons, setSelectedIcons] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Helper function to convert a File to a base64 data URL
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Reset form when drawer opens with new line
  useEffect(() => {
    if (isOpen && line) {
      setName(line.name || '');
      setDescription(line.description || '');
      setSelectedIcons(line.icons || []);
      
      // Handle photos safely - ensure it's an array
      const linePhotos = line.photos || [];
      
      // Process photos to ensure they have the correct structure
      if (Array.isArray(linePhotos) && linePhotos.length > 0) {
        console.log('[LineDrawer] Processing existing photos:', linePhotos);
        
        // Process each photo to ensure it has the correct structure for display and upload
        const processedPhotos = linePhotos.map(photo => {
          // If it's already a properly formatted photo object with POI structure, keep it as is
          if (photo.url && photo.caption) {
            return photo;
          }
          
          // If it's a Cloudinary photo (has url properties), convert to POI format
          if (photo.url || photo.thumbnailUrl || photo.largeUrl || photo.mediumUrl) {
            return {
              url: photo.url || photo.thumbnailUrl || photo.largeUrl || photo.mediumUrl,
              caption: photo.name || photo.caption || 'Photo',
              type: 'draggable'
            };
          }
          
          // For any other format, return as is (will be handled by the display logic)
          return photo;
        });
        
        setPhotos(processedPhotos);
        console.log('[LineDrawer] Processed photos:', processedPhotos);
      } else {
        setPhotos([]);
      }
      
      console.log('[LineDrawer] Initialized with line data:', {
        id: line.id,
        name: line.name,
        description: line.description,
        icons: line.icons,
        photosCount: linePhotos.length
      });
    }
  }, [isOpen, line]);

  const handlePhotoChange = async (event) => {
    if (event.target.files) {
      try {
        // Convert File objects to base64 data URLs
        const photoPromises = Array.from(event.target.files).map(async (file) => {
          // Convert file to base64 data URL
          const base64Url = await fileToBase64(file);
          
          console.log(`[LineDrawer] Converted ${file.name} to base64 data URL`);
          
          // Create a photo object that matches the POI photo structure
          const photoObject = {
            url: base64Url,
            caption: file.name,
            type: "draggable"
          };
          
          console.log(`[LineDrawer] Created POI-compatible photo object for ${file.name}`);
          
          return photoObject;
        });
        
        // Wait for all conversions to complete
        const newPhotos = await Promise.all(photoPromises);
        
        console.log('[LineDrawer] Created photo objects:', newPhotos.length);
        setPhotos(newPhotos);
      } catch (error) {
        console.error('[LineDrawer] Error converting photos to base64:', error);
      }
    }
  };

  const handleDeletePhoto = (indexToDelete) => {
    setPhotos(prevPhotos => prevPhotos.filter((_, index) => index !== indexToDelete));
  };

  const handleSave = () => {
    // Log the photos array to debug
    console.log('[LineDrawer] Photos before save:', photos);
    
    // Check if photos have the required properties for Cloudinary upload
    if (photos.length > 0) {
      photos.forEach((photo, index) => {
        console.log(`[LineDrawer] Photo ${index} details:`, {
          url: photo.url ? 'present' : 'missing',
          caption: photo.caption,
          type: photo.type
        });
      });
      
      // Verify that photos have the correct structure for POI format
      const validPhotos = photos.filter(p => p.url && p.caption);
      console.log(`[LineDrawer] Found ${validPhotos.length} valid photos with url and caption properties`);
      
      if (validPhotos.length !== photos.length) {
        console.warn(`[LineDrawer] Warning: ${photos.length - validPhotos.length} photos are missing required properties`);
      }
    }
    
    // Ensure we preserve all existing line data
    const updatedLine = {
      ...line,
      name: name.trim(),
      description: description.trim(),
      icons: selectedIcons,
      photos: photos,
      coordinates: line.coordinates, // Explicitly preserve coordinates
      type: line.type || 'line'
    };
    
    console.log('[LineDrawer] Saving line with data:', updatedLine);
    onSave(updatedLine);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: { width: 400 }
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Line Details</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
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
          sx={{ mb: 2 }}
        />

        <Divider sx={{ my: 2 }} />

        <LineIconSelection
          selectedIcons={selectedIcons}
          onIconSelect={setSelectedIcons}
        />

        <Divider sx={{ my: 2 }} />

        <Button
          component="label"
          variant="outlined"
          fullWidth
          sx={{ mb: 2 }}
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

        {photos.length > 0 && (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
            mb: 2
          }}>
            {photos.map((photo, index) => {
              // Get the photo URL - it's directly in the url property
              const photoUrl = photo.url || '';
              
              // Create a processed photo object for the preview modal
              const getProcessedPhoto = () => {
                return {
                  id: String(index),
                  name: photo.caption || `Photo ${index + 1}`,
                  url: photoUrl,
                  thumbnailUrl: photoUrl,
                  dateAdded: new Date(),
                  hasGps: false
                };
              };
              
              return (
                <Box
                  key={index}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1',
                    backgroundColor: 'rgb(35, 35, 35)',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <ButtonBase
                    onClick={() => {
                      setSelectedPhoto(getProcessedPhoto());
                    }}
                    sx={{
                      display: 'block',
                      width: '100%',
                      height: '100%'
                    }}
                  >
                    <img
                      src={photoUrl}
                      alt={photo.caption || `Photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        console.error(`Error loading photo at index ${index}:`, photo);
                        e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22288%22%20height%3D%22225%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20288%20225%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_164edaf95ee%20text%20%7B%20fill%3A%23eceeef%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A14pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_164edaf95ee%22%3E%3Crect%20width%3D%22288%22%20height%3D%22225%22%20fill%3D%22%2355595c%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2296.32500076293945%22%20y%3D%22118.8%22%3EThumbnail%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E'; // Placeholder image
                      }}
                    />
                  </ButtonBase>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(index);
                    }}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)'
                      },
                      padding: '4px'
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        )}
        
        <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Delete button - only show for existing lines */}
          {line && line.id && (
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (onDelete) {
                  onDelete(line.id);
                  onClose();
                }
              }}
            >
              Delete
            </Button>
          )}
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleSave}
              disabled={!name.trim()} // Require at least a name
            >
              Save
            </Button>
          </Box>
        </Box>
      </Box>
      
      {selectedPhoto && (
        <PhotoPreviewModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </Drawer>
  );
};

export default LineDrawer;
