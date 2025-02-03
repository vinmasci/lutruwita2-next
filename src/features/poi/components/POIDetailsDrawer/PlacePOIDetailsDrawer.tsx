import React, { useState, useEffect } from 'react';
import { Typography, IconButton, Box, Button, TextField, ButtonBase } from '@mui/material';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
import { ChevronLeft, Edit, Delete } from '@mui/icons-material';
import { StyledDrawer, IconGrid, IconGridItem, StyledTooltip, DrawerHeader, DrawerContent, DrawerFooter } from '../POIDrawer/POIDrawer.styles';
import { usePOIContext } from '../../context/POIContext';
import { PlaceNamePOI, POI_CATEGORIES, POICategory, POIPhoto } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import { ICON_PATHS } from '../../constants/icon-paths';
import { createPOIPhotos } from '../../utils/photo';
import { PhotoPreviewModal } from '../../../photo/components/PhotoPreview/PhotoPreviewModal';
import { ProcessedPhoto } from '../../../photo/components/Uploader/PhotoUploader.types';

interface PlacePOIDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  placeId: string | null;
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
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(initialDescription);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<POIPhoto[]>(initialPhotos);
  const [selectedPhoto, setSelectedPhoto] = useState<ProcessedPhoto | null>(null);

  // Cleanup when drawer closes
  useEffect(() => {
    return () => {
      if (!isOpen) {
        setIsEditing(false);
        setNewPhotos([]);
      }
    };
  }, [isOpen]);

  // Get POIs associated with this place and memoize to prevent unnecessary recalculations
  const placePOIs = React.useMemo(() => 
    pois.filter(
      (poi): poi is PlaceNamePOI => 
        poi.type === 'place' && 
        placeId !== null &&
        poi.placeId === placeId
    ),
    [pois, placeId]
  );

  // Group POIs by category
  const poiGroups = React.useMemo(() => 
    placePOIs.reduce<Record<POICategory, PlaceNamePOI[]>>((acc, poi) => {
      if (!acc[poi.category]) {
        acc[poi.category] = [];
      }
      acc[poi.category].push(poi);
      return acc;
    }, {} as Record<POICategory, PlaceNamePOI[]>),
    [placePOIs]
  );

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setNewPhotos(Array.from(event.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!placeId || placePOIs.length === 0) {
      console.error('Invalid place or no POIs found');
      return;
    }

    try {
      // Process new photos first
      const processedPhotos = await createPOIPhotos(newPhotos);
      
      // Prepare updates with photos and updatedAt timestamp
      const updates: Partial<Omit<PlaceNamePOI, 'id' | 'createdAt'>> = {
        description,
        photos: [...existingPhotos, ...processedPhotos],
        updatedAt: new Date().toISOString()
      };

      // Update all POIs for this place
      try {
        // Process each POI update sequentially to ensure consistency
        for (const poi of placePOIs) {
          // Each POI gets its own updatedAt timestamp to ensure proper persistence
          const poiUpdates = {
            ...updates,
            updatedAt: new Date().toISOString()
          };
          await updatePOI(poi.id, poiUpdates);
        }

        // Only clear state if all updates succeeded
        setNewPhotos([]);
        setIsEditing(false);

        // Close drawer to trigger parent re-render
        onClose();
      } catch (error) {
        console.error('Failed to update POIs:', error);
        throw error; // Re-throw to keep form in editing mode
      }
    } catch (error) {
      console.error('Failed to save POI details:', error);
      // Keep the form in editing mode so user can retry
    }
  };

  return (
      <NestedDrawer
        key={`${placeId}-${isOpen}`} // Force remount when place changes or drawer opens
        anchor="left"
        open={isOpen}
        onClose={() => {
          setIsEditing(false);
          onClose();
        }}
        variant="persistent"
        sx={{
          zIndex: 1300 // Higher than POIDrawer
        }}
      >
          <DrawerHeader>
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
          </DrawerHeader>

          <DrawerContent>
            <form onSubmit={handleSubmit} style={{ height: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                {/* Description Section */}
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
                        backgroundColor: 'rgba(45, 45, 45, 0.9)',
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

                {/* POIs Section */}
                {Object.entries(poiGroups).map(([category, pois]) => {
                  const categoryInfo = POI_CATEGORIES[category as POICategory];
                  return (
                    <Box key={category} sx={{ mb: 2 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'white',
                          mb: 0.5,
                          display: 'block',
                          fontSize: '0.7rem',
                          opacity: 0.7,
                          letterSpacing: '0.5px'
                        }}
                      >
                        {categoryInfo.label}
                      </Typography>
                      <IconGrid>
                        {pois.map((poi) => {
                          const iconDef = getIconDefinition(poi.icon);
                          if (!iconDef) return null;
                          return (
                            <IconGridItem
                              key={poi.id}
                              onMouseEnter={() => setHoveredIcon(poi.id)}
                              onMouseLeave={() => setHoveredIcon(null)}
                              sx={{ 
                                position: 'relative',
                                width: '20px',
                                height: '20px',
                                backgroundColor: poi.style?.color || categoryInfo.color,
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <i 
                                className={ICON_PATHS[iconDef.name]} 
                                style={{ fontSize: '12px', color: 'white' }} 
                              />
                              {hoveredIcon === poi.id && (
                                <StyledTooltip>
                                  {poi.name}
                                </StyledTooltip>
                              )}
                            </IconGridItem>
                          );
                        })}
                      </IconGrid>
                    </Box>
                  );
                })}

                {/* Photos Section */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Photos
                  </Typography>
                  {isEditing && (
                    <Button
                      component="label"
                      variant="outlined"
                      fullWidth
                      sx={{ 
                        backgroundColor: 'rgba(45, 45, 45, 0.9)',
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
                  )}

                  {/* Existing photos */}
                  {existingPhotos && existingPhotos.length > 0 && (
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 1,
                      mt: 2
                    }}>
                      {existingPhotos.map((photo: POIPhoto, index: number) => (
                        <ButtonBase
                          key={index}
                          onClick={() => {
                            // Convert POIPhoto to ProcessedPhoto format
                            const processedPhoto: ProcessedPhoto = {
                              id: String(index),
                              name: photo.caption || `Photo ${index + 1}`,
                              url: photo.url,
                              thumbnailUrl: photo.url,
                              dateAdded: new Date(),
                              hasGps: false
                            };
                            setSelectedPhoto(processedPhoto);
                          }}
                          sx={{
                            display: 'block',
                            width: '100%',
                            aspectRatio: '1',
                            backgroundColor: 'rgba(35, 35, 35, 0.9)',
                            borderRadius: 1,
                            overflow: 'hidden',
                            position: 'relative'
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
                                e.stopPropagation(); // Prevent opening preview when deleting
                                setExistingPhotos(photos => photos.filter((_, i) => i !== index));
                              }}
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                '&:hover': {
                                  backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                }
                              }}
                            >
                              <Delete sx={{ fontSize: 16, color: 'white' }} />
                            </IconButton>
                          )}
                        </ButtonBase>
                      ))}
                    </Box>
                  )}

                  {/* New photo previews */}
                  {isEditing && newPhotos.length > 0 && (
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)',
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
                          <IconButton
                            size="small"
                            onClick={() => setNewPhotos(photos => photos.filter((_, i) => i !== index))}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.7)'
                              }
                            }}
                          >
                            <Delete sx={{ fontSize: 16, color: 'white' }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Action buttons */}
                <DrawerFooter>
                  {isEditing ? (
                    <>
                      <Button
                        variant="text"
                        onClick={() => {
                          setDescription(initialDescription);
                          setNewPhotos([]);
                          setIsEditing(false);
                        }}
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
                          backgroundColor: placePOIs?.[0]?.style?.color || POI_CATEGORIES[placePOIs?.[0]?.category || 'other'].color,
                          '&:hover': {
                            backgroundColor: placePOIs?.[0]?.style?.color || POI_CATEGORIES[placePOIs?.[0]?.category || 'other'].color,
                            opacity: 0.9
                          }
                        }}
                      >
                        Save
                      </Button>
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="contained"
                        size="medium"
                        startIcon={<Edit />}
                        sx={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)'
                          }
                        }}
                      >
                        EDIT
                      </Button>
                    </Box>
                  )}
                </DrawerFooter>
              </Box>
            </form>
          </DrawerContent>
          {selectedPhoto && (
            <PhotoPreviewModal
              photo={selectedPhoto}
              onClose={() => setSelectedPhoto(null)}
            />
          )}
      </NestedDrawer>
  );
};

export default PlacePOIDetailsDrawer;
