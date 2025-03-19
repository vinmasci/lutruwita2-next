import React, { useState, useRef } from 'react';
import { 
  Box, Typography, TextField, Button, 
  IconButton, Grid
} from '@mui/material';
import { ChevronLeft, Save, Cancel, AddPhotoAlternate } from '@mui/icons-material';
import { DrawerHeader, DrawerContent } from './TextboxTabsDrawer.styles';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
import { TabColors, TabPointerDirections } from '../../context/TextboxTabsContext';
import ColorSelector from './ColorSelector.jsx';
import DirectionSelector from './DirectionSelector.jsx';
import IconSelector from './IconSelector.jsx';
import { createTextboxTabPhotos } from './utils/photo';

const TextboxTabDetailsDrawer = ({ 
  isOpen, 
  onClose, 
  initialTab,
  onSave 
}) => {
  const [text, setText] = useState(initialTab?.text || '');
  const [content, setContent] = useState(initialTab?.content || '');
  const [icon, setIcon] = useState(initialTab?.icon || '');
  const [backgroundColor, setBackgroundColor] = useState(initialTab?.backgroundColor || TabColors.DEFAULT);
  const [pointerDirection, setPointerDirection] = useState(initialTab?.pointerDirection || TabPointerDirections.RIGHT);
  const [photos, setPhotos] = useState([]);
  const fileInputRef = useRef(null);

  const handleSave = () => {
    onSave({
      text,
      content,
      icon,
      backgroundColor,
      pointerDirection,
      photos
    });
  };

  const handleCancel = () => {
    onClose();
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    try {
      const newPhotos = await createTextboxTabPhotos(files);
      setPhotos([...photos, ...newPhotos]);
    } catch (error) {
      console.error('Error uploading photos:', error);
    }
  };

  const handleRemovePhoto = (index) => {
    const updatedPhotos = [...photos];
    updatedPhotos.splice(index, 1);
    setPhotos(updatedPhotos);
  };

  return (
    <NestedDrawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      variant="temporary"
      sx={{
        '& .MuiDrawer-paper': {
          backgroundColor: 'rgba(0, 0, 0, 1)',
          borderLeft: '1px solid #333',
        }
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <DrawerHeader>
          <IconButton
            onClick={onClose}
            sx={{
              mr: 1,
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <ChevronLeft />
          </IconButton>
          <Box
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              flexGrow: 1, 
              gap: 1
            }}
          >
            <Typography variant="h6" color="white">
              Create Textbox Tab
            </Typography>
          </Box>
        </DrawerHeader>
        <DrawerContent>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              label="Tab Text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              margin="normal"
              variant="outlined"
              sx={{ mb: 2 }}
              InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
              InputProps={{ sx: { color: 'white' } }}
            />
            
            <TextField
              fullWidth
              label="Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              margin="normal"
              variant="outlined"
              multiline
              rows={4}
              sx={{ mb: 2 }}
              InputLabelProps={{ sx: { color: 'rgba(255, 255, 255, 0.7)' } }}
              InputProps={{ sx: { color: 'white' } }}
            />
            
            <Typography variant="subtitle1" color="white" sx={{ mb: 1 }}>
              Icon
            </Typography>
            <IconSelector 
              selectedIcon={icon} 
              onSelectIcon={setIcon} 
            />
            
            <Typography variant="subtitle1" color="white" sx={{ mt: 2, mb: 1 }}>
              Background Color
            </Typography>
            <ColorSelector 
              selectedColor={backgroundColor} 
              onSelectColor={setBackgroundColor} 
            />
            
            <Typography variant="subtitle1" color="white" sx={{ mt: 2, mb: 1 }}>
              Pointer Direction
            </Typography>
            <DirectionSelector 
              selectedDirection={pointerDirection} 
              onSelectDirection={setPointerDirection} 
            />
            
            {/* Photo upload section */}
            <Typography variant="subtitle1" color="white" sx={{ mt: 2, mb: 1 }}>
              Photos
            </Typography>
            <Box sx={{ mb: 2 }}>
              <input
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handlePhotoUpload}
              />
              <Button
                variant="outlined"
                startIcon={<AddPhotoAlternate />}
                onClick={() => fileInputRef.current.click()}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Add Photos
              </Button>
            </Box>
            
            {photos.length > 0 && (
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {photos.map((photo, index) => (
                  <Grid item xs={4} key={index}>
                    <Box
                      sx={{
                        position: 'relative',
                        height: 100,
                        borderRadius: 1,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.8
                        }
                      }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || `Photo ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.7)'
                          }
                        }}
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <Cancel fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
              >
                Save
              </Button>
            </Box>
          </Box>
        </DrawerContent>
      </Box>
    </NestedDrawer>
  );
};

export default TextboxTabDetailsDrawer;
