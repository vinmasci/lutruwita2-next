import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Accordion, AccordionSummary, AccordionDetails, Divider, IconButton } from '@mui/material';
import { StyledDrawer, DrawerHeader, DrawerContent, DrawerFooter } from '../POIDrawer/POIDrawer.styles';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
import { usePOIContext } from '../../context/POIContext';
import { POIPhoto, POIType, PlaceNamePOI } from '../../types/poi.types';
import { Edit, Save, Cancel, ExpandMore, ChevronLeft } from '@mui/icons-material';
import { getIconDefinition } from '../../constants/poi-icons';
import { createPOIPhotos } from '../../utils/photo';

interface PlacePOIDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  placeId: string;
  placeName: string;
  description?: string;
  photos?: POIPhoto[];
}

const PlacePOIDetailsDrawer: React.FC<PlacePOIDetailsDrawerProps> = ({
  isOpen,
  onClose,
  placeId,
  placeName,
  description: initialDescription = '',
  photos: initialPhotos = []
}) => {
  const { pois, updatePOI } = usePOIContext();
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(initialDescription);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [expandedPOI, setExpandedPOI] = useState<string | false>(false);

  // Get POIs associated with this place that have content (description or photos)
  const placePOIs = pois.filter(
    (poi): poi is PlaceNamePOI => 
      poi.type === 'place' && 
      poi.placeId === placeId && 
      (poi.description || (Array.isArray(poi.photos) && poi.photos.length > 0))
  );

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setDescription(initialDescription);
      setNewPhotos([]);
      setIsEditing(false);
      setExpandedPOI(false);
    }
  }, [isOpen, initialDescription]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setNewPhotos(Array.from(event.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const processedPhotos = await createPOIPhotos(newPhotos);
    updatePOI(placeId, {
      description,
      photos: [
        ...(initialPhotos || []),
        ...processedPhotos
      ]
    });
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setDescription(initialDescription);
    setNewPhotos([]);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setDescription(initialDescription);
    setNewPhotos([]);
    setIsEditing(false);
  };

  const handlePOIAccordionChange = (poiId: string) => (
    _event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedPOI(isExpanded ? poiId : false);
  };

  const handleUpdatePOI = (poiId: string, updates: Partial<POIType>) => {
    updatePOI(poiId, updates);
  };

  return (
    <NestedDrawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      variant="persistent"
      sx={{
        zIndex: 1300
      }}
    >
      <StyledDrawer>
        <DrawerHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <IconButton
              onClick={onClose}
              sx={{ 
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6">{placeName}</Typography>
          </Box>
          {!isEditing ? (
            <Button
              startIcon={<Edit />}
              onClick={handleStartEditing}
              sx={{ 
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Edit
            </Button>
          ) : null}
        </DrawerHeader>

        <DrawerContent>
          <form onSubmit={handleSubmit} style={{ height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
              {/* Place Description Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  About this place
                </Typography>
                {isEditing ? (
                  <TextField
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={4}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{ 
                      backgroundColor: 'rgba(35, 35, 35, 0.9)',
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        }
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)'
                      },
                      '& .MuiOutlinedInput-input': {
                        color: 'rgba(255, 255, 255, 0.9)'
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {description || 'No description available'}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

              {/* POIs Section */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Points of Interest ({placePOIs.length})
                </Typography>
                {placePOIs.map((poi) => {
                  // Only show POIs that have content
                  if (!poi.description && (!poi.photos || poi.photos.length === 0)) {
                    return null;
                  }
                  
                  const iconDef = getIconDefinition(poi.icon);
                  return (
                    <Accordion
                      key={poi.id}
                      expanded={Boolean(expandedPOI === poi.id)}
                      onChange={handlePOIAccordionChange(poi.id)}
                      sx={{
                        backgroundColor: 'rgba(35, 35, 35, 0.9)',
                        color: 'white',
                        '&:before': {
                          display: 'none',
                        },
                        '& .MuiAccordionSummary-root': {
                          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                        }
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMore sx={{ color: 'white' }} />}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i 
                            className={`lucide-${iconDef?.name}`}
                            style={{ 
                              color: poi.style?.color,
                              fontSize: '20px' 
                            }} 
                          />
                          <Typography>{poi.name}</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {isEditing ? (
                            <TextField
                              label="Description"
                              value={poi.description || ''}
                              onChange={(e) => handleUpdatePOI(poi.id, { description: e.target.value })}
                              multiline
                              rows={2}
                              fullWidth
                              variant="outlined"
                              size="small"
                              sx={{ 
                                backgroundColor: 'rgba(25, 25, 25, 0.9)',
                                '& .MuiOutlinedInput-root': {
                                  '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                  },
                                  '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                  }
                                },
                                '& .MuiInputLabel-root': {
                                  color: 'rgba(255, 255, 255, 0.7)'
                                },
                                '& .MuiOutlinedInput-input': {
                                  color: 'rgba(255, 255, 255, 0.9)'
                                }
                              }}
                            />
                          ) : (
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {poi.description || 'No description available'}
                            </Typography>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>

              {/* Photos Section */}
              {isEditing && (
                <>
                  <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Photos
                    </Typography>
                    <Button
                      component="label"
                      variant="outlined"
                      fullWidth
                      sx={{ 
                        backgroundColor: 'rgba(35, 35, 35, 0.9)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        '&:hover': {
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          backgroundColor: 'rgba(45, 45, 45, 0.9)'
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
                    {/* Existing photos */}
                    {initialPhotos && initialPhotos.length > 0 && (
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 1,
                        mt: 2
                      }}>
                        {initialPhotos.map((photo: POIPhoto, index: number) => (
                          <Box 
                            key={index}
                            sx={{
                              aspectRatio: '1',
                              backgroundColor: 'rgba(35, 35, 35, 0.9)',
                              borderRadius: 1,
                              overflow: 'hidden'
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
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* New photo previews */}
                    {newPhotos.length > 0 && (
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 1,
                        mt: 2
                      }}>
                        {newPhotos.map((photo, index) => (
                          <Box 
                            key={index}
                            sx={{
                              aspectRatio: '1',
                              backgroundColor: 'rgba(35, 35, 35, 0.9)',
                              borderRadius: 1,
                              overflow: 'hidden'
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
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </>
              )}

              {/* Action buttons */}
              {isEditing && (
                <DrawerFooter>
                  <Button
                    variant="text"
                    onClick={handleCancelEditing}
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
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)'
                      }
                    }}
                  >
                    Save
                  </Button>
                </DrawerFooter>
              )}
            </Box>
          </form>
        </DrawerContent>
      </StyledDrawer>
    </NestedDrawer>
  );
};

export default PlacePOIDetailsDrawer;
