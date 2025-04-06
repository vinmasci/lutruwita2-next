import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Rating
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import { PhotoPreviewModal } from '../../../photo/components/PhotoPreview/PhotoPreviewModal';
import { usePOIContext } from '../../context/POIContext';

// Debounce function to limit API calls
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

const POIDetailsModal = ({ isOpen, onClose, iconName, category, coordinates, onSave, readOnly = false }) => {
  const { searchPlaces, processGooglePlacesLink } = usePOIContext();
  // Get the icon definition for default name
  const iconDef = getIconDefinition(iconName);
  
  // Add fallback color in case the category doesn't exist in POI_CATEGORIES
  const categoryColor = POI_CATEGORIES[category]?.color || '#777777'; // Default gray color if category not found
  
  // State for form fields
  const [name, setName] = useState(iconDef?.label || '');
  const [description, setDescription] = useState('');
  const [googlePlacesLink, setGooglePlacesLink] = useState('');
  const [googlePlacesData, setGooglePlacesData] = useState(null);
  const [isProcessingLink, setIsProcessingLink] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
  // State for auto-search
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  
  // Reset form when modal opens with new POI
  useEffect(() => {
    if (isOpen) {
      setName(iconDef?.label || '');
      setDescription('');
      setGooglePlacesLink('');
      setGooglePlacesData(null);
      setIsProcessingLink(false);
      setLinkError(null);
      setPhotos([]);
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
    }
  }, [isOpen, iconDef]);
  
  // Auto-search for places when name changes
  const searchForPlaces = useCallback(async (searchName) => {
    if (!searchName || searchName.trim() === '' || !isOpen || readOnly) {
      setSearchResults([]);
      return;
    }
    
    // Don't search if the name is just the default icon label
    if (searchName === iconDef?.label) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      // We need coordinates to search
      if (!coordinates) {
        console.warn('[POIDetailsModal] Cannot search without coordinates');
        setSearchError('Cannot search without coordinates');
        setIsSearching(false);
        return;
      }
      
      const results = await searchPlaces(searchName, coordinates);
      setSearchResults(results);
    } catch (error) {
      console.error('[POIDetailsModal] Error searching for places:', error);
      setSearchError('Error searching for places');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [isOpen, readOnly, iconDef?.label, coordinates, searchPlaces]);
  
  // Debounced version of searchForPlaces
  const debouncedSearch = useCallback(debounce(searchForPlaces, 800), [searchForPlaces]);
  
  // Trigger search when name changes
  useEffect(() => {
    if (isOpen && name && name.trim() !== '' && !readOnly) {
      debouncedSearch(name);
    } else {
      setSearchResults([]);
    }
  }, [isOpen, name, readOnly, debouncedSearch]);
  
  // Process Google Places link
  const processLink = async (link) => {
    if (!link) {
      setGooglePlacesData(null);
      setIsProcessingLink(false);
      setLinkError(null);
      return;
    }
    
    setIsProcessingLink(true);
    setLinkError(null);
    
    try {
      const data = await processGooglePlacesLink(link);
      if (data) {
        setGooglePlacesData(data);
        // If name is empty or default, use the place name
        if (!name || name === iconDef?.label) {
          setName(data.name);
        }
      } else {
        setGooglePlacesData(null);
        setLinkError('Could not process Google Places link. Please check the format.');
      }
    } catch (error) {
      console.error('[POIDetailsModal] Error processing Google Places link:', error);
      setGooglePlacesData(null);
      setLinkError('Error processing link: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessingLink(false);
    }
  };
  
  // Handle place selection from search results
  const handleSelectPlace = async (place) => {
    if (!place || !place.placeId) return;
    
    // Set the name from the selected place
    setName(place.name);
    
    // Set the Google Places link
    setGooglePlacesLink(place.url);
    
    // Process the link to get place details
    await processLink(place.url);
    
    // Clear search results after selection
    setSearchResults([]);
  };
  
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
      googlePlacesLink,
      photos,
      // Include the Google Places data if available
      ...(googlePlacesData && { googlePlaces: googlePlacesData }),
      // Include the Google Place ID if available
      ...(googlePlacesData?.placeId && { googlePlaceId: googlePlacesData.placeId })
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
              
              <Box sx={{ position: 'relative' }}>
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
                {isSearching && (
                  <CircularProgress
                    size={20}
                    sx={{
                      position: 'absolute',
                      right: 12,
                      top: 12,
                      color: 'white'
                    }}
                  />
                )}
                
                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <List
                    sx={{
                      position: 'absolute',
                      width: '100%',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      backgroundColor: 'rgb(45, 45, 45)',
                      color: 'white',
                      zIndex: 1000,
                      borderRadius: '4px',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
                      mt: 0.5
                    }}
                  >
                    {searchResults.map((place, index) => (
                      <ListItem
                        key={place.placeId}
                        button
                        onClick={() => handleSelectPlace(place)}
                        sx={{
                          borderBottom: index < searchResults.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                          },
                          py: 0.5
                        }}
                      >
                        <Typography color="white">
                          {place.name}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
              
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
