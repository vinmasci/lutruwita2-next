import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, Typography, Modal, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, ButtonBase, Grid } from '@mui/material';
import { ChevronLeft, Close, Edit, Save, Cancel, Delete, AddPhotoAlternate } from '@mui/icons-material';
import { DrawerHeader, DrawerContent } from './TextboxTabsDrawer.styles';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
import { TEXTBOX_ICON_PATHS } from './textbox-icon-paths';
import { TabColors, useTextboxTabs } from '../../context/TextboxTabsContext';
import { createTextboxTabPhotos } from './utils/photo';

export const TextboxTabViewer = ({ tab, onClose, displayMode = "drawer", isEditingInitial = false }) => {
  const { updateTab } = useTextboxTabs();
  const [selectedTab, setSelectedTab] = useState(tab);
  const [isEditing, setIsEditing] = useState(isEditingInitial);
  const [editedContent, setEditedContent] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const fileInputRef = useRef(null);
  
  // Keep tab data in sync
  useEffect(() => {
    if (tab) {
      setSelectedTab(tab);
      setEditedContent(tab.content || '');
      setPhotos(tab.photos || []);
    }
  }, [tab]);
  
  if (!selectedTab) return null;
  
  // Determine text color based on background color
  const textColor = selectedTab.backgroundColor === TabColors.WHITE ? 'black' : 'white';
  
  // Handle edit button click
  const handleEditClick = () => {
    setIsEditing(true);
    setEditedContent(selectedTab.content || '');
  };
  
  // Handle save button click
  const handleSaveClick = () => {
    const updatedTab = {
      ...selectedTab,
      content: editedContent,
      photos: photos
    };
    
    updateTab(selectedTab.id, updatedTab);
    setSelectedTab(updatedTab);
    setIsEditing(false);
  };
  
  // Handle cancel button click
  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedContent(selectedTab.content || '');
  };
  
  // Handle content change
  const handleContentChange = (e) => {
    setEditedContent(e.target.value);
  };
  
  // Handle photo upload
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
  
  // Handle photo click
  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
    setPhotoPreviewOpen(true);
  };
  
  // Handle photo delete
  const handlePhotoDelete = (photoToDelete) => {
    const updatedPhotos = photos.filter(photo => photo.url !== photoToDelete.url);
    setPhotos(updatedPhotos);
  };
  
  // Handle photo preview close
  const handlePhotoPreviewClose = () => {
    setPhotoPreviewOpen(false);
    setSelectedPhoto(null);
  };
  
  // Render drawer content
  const renderDrawerContent = () => {
    return (
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
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              {selectedTab.icon && TEXTBOX_ICON_PATHS[selectedTab.icon] && (
                <i
                  className={TEXTBOX_ICON_PATHS[selectedTab.icon]}
                  style={{
                    color: textColor,
                    fontSize: '24px'
                  }}
                />
              )}
              <Typography variant="h6" color="white">
                {selectedTab.text || "Untitled Tab"}
              </Typography>
            </Box>
          </Box>
          {!isEditing ? (
            <IconButton
              onClick={handleEditClick}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <Edit />
            </IconButton>
          ) : (
            <>
              <IconButton
                onClick={handleSaveClick}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <Save />
              </IconButton>
              <IconButton
                onClick={handleCancelClick}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <Cancel />
              </IconButton>
            </>
          )}
        </DrawerHeader>
        <DrawerContent>
          {isEditing ? (
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={editedContent}
                onChange={handleContentChange}
                variant="outlined"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.7)',
                    },
                  },
                }}
              />
              
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
                        onClick={() => handlePhotoClick(photo)}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePhotoDelete(photo);
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  borderRadius: '4px',
                  backgroundColor: 'rgba(45, 45, 45, 0.9)',
                }}
              >
                <Typography
                  variant="body1"
                  color="white"
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  {selectedTab.content || selectedTab.text || 'No content'}
                </Typography>
              </Box>
              
              {photos.length > 0 && (
                <Box sx={{ p: 2 }}>
                  <Typography variant="h6" color="white" sx={{ mb: 1 }}>
                    Photos
                  </Typography>
                  <Grid container spacing={1}>
                    {photos.map((photo, index) => (
                      <Grid item xs={4} key={index}>
                        <Box
                          sx={{
                            height: 100,
                            borderRadius: 1,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            '&:hover': {
                              opacity: 0.8
                            }
                          }}
                          onClick={() => handlePhotoClick(photo)}
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
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </>
          )}
        </DrawerContent>
      </Box>
    );
  };
  
  // Render modal content
  const renderModalContent = () => {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%'
        }}
      >
        {/* Header with title and close button */}
        <Box
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedTab.icon && TEXTBOX_ICON_PATHS[selectedTab.icon] && (
              <i 
                className={TEXTBOX_ICON_PATHS[selectedTab.icon]} 
                style={{ 
                  fontSize: '24px', 
                  color: textColor 
                }}
              />
            )}
            <Typography variant="h6" color="white">
              {selectedTab.text || "Untitled Tab"}
            </Typography>
          </Box>
          <Box>
            {!isEditing ? (
              <IconButton
                onClick={handleEditClick}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <Edit />
              </IconButton>
            ) : (
              <>
                <IconButton
                  onClick={handleSaveClick}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <Save />
                </IconButton>
                <IconButton
                  onClick={handleCancelClick}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <Cancel />
                </IconButton>
              </>
            )}
            <IconButton
              onClick={onClose}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </Box>
        
        {/* Content area */}
        {isEditing ? (
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={6}
              value={editedContent}
              onChange={handleContentChange}
              variant="outlined"
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                  },
                },
              }}
            />
            
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
              <Grid container spacing={1}>
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
                      onClick={() => handlePhotoClick(photo)}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePhotoDelete(photo);
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        ) : (
          <>
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: '4px',
                backgroundColor: 'rgba(45, 45, 45, 0.9)',
                width: '100%'
              }}
            >
              <Typography
                variant="body1"
                color="white"
                sx={{ whiteSpace: 'pre-wrap' }}
              >
                {selectedTab.content || selectedTab.text || 'No content'}
              </Typography>
            </Box>
            
            {photos.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" color="white" sx={{ mb: 1 }}>
                  Photos
                </Typography>
                <Grid container spacing={1}>
                  {photos.map((photo, index) => (
                    <Grid item xs={4} key={index}>
                      <Box
                        sx={{
                          height: 100,
                          borderRadius: 1,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8
                          }
                        }}
                        onClick={() => handlePhotoClick(photo)}
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
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </>
        )}
      </Box>
    );
  };
  
  // Render either drawer or modal based on displayMode
  return (
    <>
      {displayMode === "drawer" ? (
        <NestedDrawer
          anchor="left"
          open={Boolean(selectedTab)}
          onClose={onClose}
          variant="temporary"
          sx={{
            '& .MuiDrawer-paper': {
              backgroundColor: 'rgba(0, 0, 0, 1)',
              borderLeft: '1px solid #333',
            }
          }}
        >
          {renderDrawerContent()}
        </NestedDrawer>
      ) : (
        <Modal
          open={Boolean(selectedTab)}
          onClose={onClose}
          aria-labelledby="textbox-tab-viewer-modal"
          disableScrollLock={true}
          disableAutoFocus={true}
          keepMounted={true}
          sx={{ 
            zIndex: 9999,
            '& .MuiBackdrop-root': {
              position: 'absolute'
            }
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              bgcolor: 'rgba(35, 35, 35, 0.95)',
              border: '1px solid rgba(30, 136, 229, 0.5)',
              borderRadius: 2,
              boxShadow: 24,
              p: 4,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 9999
            }}
          >
            {/* Header with title and close button */}
            <Box
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 3
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedTab.icon && TEXTBOX_ICON_PATHS[selectedTab.icon] && (
                  <i 
                    className={TEXTBOX_ICON_PATHS[selectedTab.icon]} 
                    style={{ 
                      fontSize: '24px', 
                      color: textColor 
                    }}
                  />
                )}
                <Typography variant="h6" color="white">
                  {selectedTab.text || "Untitled Tab"}
                </Typography>
              </Box>
              <IconButton
                onClick={onClose}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <Close />
              </IconButton>
            </Box>
            
            {/* Content area */}
            <Box>
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  borderRadius: '4px',
                  backgroundColor: 'rgba(45, 45, 45, 0.9)',
                }}
              >
                <Typography
                  variant="body1"
                  color="white"
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  {selectedTab.content || selectedTab.text || 'No description'}
                </Typography>
              </Box>
              
              {photos.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="white" sx={{ mb: 1 }}>
                    Photos ({photos.length})
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 1
                    }}
                  >
                    {photos.map((photo, index) => (
                      <Box
                        key={index}
                        onClick={() => handlePhotoClick(photo)}
                        sx={{
                          aspectRatio: '1',
                          backgroundColor: 'rgba(35, 35, 35, 0.9)',
                          borderRadius: 1,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
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
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Modal>
      )}
      
      {/* Photo Preview Modal */}
      <Modal
        open={photoPreviewOpen}
        onClose={handlePhotoPreviewClose}
        disableScrollLock={true}
        disableAutoFocus={true}
        keepMounted={true}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000, // Higher than the tab viewer modal
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            position: 'absolute'
          }
        }}
      >
        <Box
          sx={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            outline: 'none'
          }}
        >
          {selectedPhoto && (
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || 'Full size photo'}
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain'
              }}
            />
          )}
          <IconButton
            onClick={handlePhotoPreviewClose}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)'
              }
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </Modal>
    </>
  );
};

export default TextboxTabViewer;
