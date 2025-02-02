import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography, Dialog, DialogContent, TextField, Button, Drawer, Slide } from '@mui/material';
import { ChevronLeft, Close, Edit, Save, Cancel } from '@mui/icons-material';
import { DrawerHeader, DrawerContent } from '../POIDrawer/POIDrawer.styles';
import { POI_CATEGORIES, POIType, POIPhoto } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import { createPOIPhotos } from '../../utils/photo';
import { usePOIContext } from '../../context/POIContext';

interface POIViewerProps {
  poi: POIType | null;
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<POIType>) => void;
}

export const POIViewer: React.FC<POIViewerProps> = ({ poi: initialPoi, onClose, onUpdate }) => {
  const { pois } = usePOIContext();
  const [poi, setPoi] = useState(initialPoi);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(initialPoi?.name || '');
  const [editedDescription, setEditedDescription] = useState(initialPoi?.description || '');
  const [newPhotos, setNewPhotos] = useState<POIPhoto[]>([]);

  // Initialize edited states
  useEffect(() => {
    if (initialPoi) {
      setEditedName(initialPoi.name);
      setEditedDescription(initialPoi.description || '');
    }
  }, [initialPoi]);

  // Keep POI data in sync with context
  useEffect(() => {
    if (initialPoi) {
      const updatedPoi = pois.find(p => p.id === initialPoi.id);
      if (updatedPoi) {
        setPoi(updatedPoi);
        // Update edited states if not in edit mode
        if (!isEditing) {
          setEditedName(updatedPoi.name);
          setEditedDescription(updatedPoi.description || '');
        }
      }
    }
  }, [pois, initialPoi, isEditing]);

  if (!poi) return null;

  const handleSave = () => {
    if (onUpdate) {
      const updates: Partial<POIType> = {};
      if (editedName !== poi.name) updates.name = editedName;
      if (editedDescription !== poi.description) updates.description = editedDescription;
      
      // Always include photos in updates to handle both additions and deletions
      // Use the local state for existing photos to include any deletions
      updates.photos = [...(poi.photos || []), ...newPhotos];
      
      onUpdate(poi.id, updates);
    }
    setIsEditing(false);
    setNewPhotos([]);
  };

  const handleStartEditing = () => {
    setEditedName(poi.name);
    setEditedDescription(poi.description || '');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditedName(poi.name);
    setEditedDescription(poi.description || '');
    setNewPhotos([]);
  };

  const handleAddPhotos = async (files: File[]) => {
    const photos = await createPOIPhotos(files);
    setNewPhotos(prev => [...prev, ...photos]);
  };

  const handleRemoveNewPhoto = (index: number) => {
    const updatedPhotos = [...newPhotos];
    updatedPhotos.splice(index, 1);
    setNewPhotos(updatedPhotos);
  };

  const iconDef = getIconDefinition(poi.icon);
  const categoryColor = POI_CATEGORIES[poi.category].color;

  return (
    <>
      <Drawer
        anchor="left"
        open={Boolean(poi)}
        onClose={onClose}
        variant="temporary"
        ModalProps={{
          keepMounted: true,
        }}
        SlideProps={{
          direction: "right"
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: '264px',
            marginLeft: '56px',
            backgroundColor: 'rgba(35, 35, 35, 0.9)',
            borderLeft: '1px solid #333',
            color: '#ffffff',
            height: '100%',
            position: 'absolute'
          }
        }}
      >
        <Box sx={{ 
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(35, 35, 35, 0.9)',
          display: 'flex',
          flexDirection: 'column',
        }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
              <i 
                className={`lucide-${iconDef?.name}`}
                style={{ 
                  color: categoryColor,
                  fontSize: '24px' 
                }} 
              />
              {isEditing ? (
                <TextField
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  variant="standard"
                  sx={{
                    input: { color: 'white', fontSize: '1.25rem' },
                    '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255, 255, 255, 0.42)' },
                    '& .MuiInput-underline:hover:before': { borderBottomColor: 'rgba(255, 255, 255, 0.87)' },
                  }}
                />
              ) : (
                <Typography variant="h6">
                  {poi.name}
                </Typography>
              )}
            </Box>
          </DrawerHeader>

          <DrawerContent>
            {/* Icon and Category */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              backgroundColor: 'rgba(45, 45, 45, 0.9)',
              padding: '12px',
              borderRadius: '4px',
              mb: 2
            }}>
              <i 
                className={`lucide-${iconDef?.name}`}
                style={{ 
                  color: categoryColor,
                  fontSize: '24px' 
                }} 
              />
              <Typography variant="body2" color="text.secondary">
                {POI_CATEGORIES[poi.category].label}
              </Typography>
            </Box>

            {/* Description */}
            <Box sx={{ mb: 3 }}>
              {isEditing ? (
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                    },
                  }}
                />
              ) : (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {poi.description || 'No description'}
                </Typography>
              )}
            </Box>

            {/* Photos */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Photos ({(poi.photos?.length || 0) + newPhotos.length})
                </Typography>
                {isEditing && (
                  <Button
                    component="label"
                    variant="outlined"
                    size="small"
                    sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.23)' }}
                  >
                    Add Photos
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        handleAddPhotos(files);
                      }}
                    />
                  </Button>
                )}
              </Box>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1
              }}>
                {/* Existing photos */}
                {poi.photos?.map((photo, index) => (
                  <Box
                    key={index}
                    onClick={() => setSelectedPhoto(photo.url)}
                    sx={{
                      aspectRatio: '1',
                      backgroundColor: 'rgba(35, 35, 35, 0.9)',
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      position: 'relative',
                      '&:hover': {
                        transform: 'scale(1.02)'
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
                    {isEditing && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (poi.photos) {
                            const updatedPhotos = [...poi.photos];
                            updatedPhotos.splice(index, 1);
                            // Update both local state and trigger save
                            setPoi({ ...poi, photos: updatedPhotos });
                            if (onUpdate) {
                              onUpdate(poi.id, { photos: updatedPhotos });
                            }
                          }
                        }}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.7)'
                          }
                        }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
                
                {/* New photos preview */}
                {newPhotos.map((photo, index) => (
                  <Box
                    key={`new-${index}`}
                    sx={{
                      aspectRatio: '1',
                      backgroundColor: 'rgba(35, 35, 35, 0.9)',
                      borderRadius: 1,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || `New photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    {isEditing && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveNewPhoto(index)}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.7)'
                          }
                        }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Created/Updated Info */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Created: {new Date(poi.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Updated: {new Date(poi.updatedAt).toLocaleString()}
              </Typography>
            </Box>

            {/* Edit/Save Controls */}
            <Box sx={{ 
              mt: 3, 
              display: 'flex', 
              gap: 1, 
              justifyContent: 'flex-end',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              pt: 2
            }}>
              {!isEditing ? (
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={handleStartEditing}
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                >
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={handleCancelEditing}
                    sx={{ 
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                      '&:hover': {
                        borderColor: 'rgba(255, 255, 255, 0.5)'
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                    color="primary"
                  >
                    Save
                  </Button>
                </>
              )}
            </Box>
          </DrawerContent>
        </Box>
      </Drawer>

      {/* Full-screen Photo Dialog */}
      <Dialog 
        open={Boolean(selectedPhoto)} 
        onClose={() => setSelectedPhoto(null)}
        maxWidth="xl"
        fullWidth
      >
        <IconButton
          onClick={() => setSelectedPhoto(null)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }
          }}
        >
          <Close />
        </IconButton>
        <DialogContent sx={{ p: 0 }}>
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Full size"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block'
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default POIViewer;
