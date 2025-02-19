import React, { useState } from 'react';
import { Box, IconButton, Typography, Dialog, DialogContent } from '@mui/material';
import { ChevronLeft, Close } from '@mui/icons-material';
import { DrawerHeader, DrawerContent } from '../../../poi/components/POIDrawer/POIDrawer.styles';
import { NestedDrawer } from '../../../map/components/Sidebar/Sidebar.styles';
import { POI_CATEGORIES, POIType } from '../../../poi/types/poi.types';
import { getIconDefinition } from '../../../poi/constants/poi-icons';

interface PresentationPOIViewerProps {
  poi: POIType | null;
  onClose: () => void;
}

export const PresentationPOIViewer: React.FC<PresentationPOIViewerProps> = ({ 
  poi,
  onClose 
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!poi) return null;

  const iconDef = getIconDefinition(poi.icon);
  const categoryColor = POI_CATEGORIES[poi.category].color;

  return (
    <>
      <NestedDrawer
        anchor="left"
        open={Boolean(poi)}
        onClose={onClose}
        variant="temporary"
        sx={{
          '& .MuiDrawer-paper': {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            borderLeft: '1px solid #333',
          }
        }}
      >
        <Box sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
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
              <Typography variant="h6">
                {poi.name}
              </Typography>
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
            <Box 
              sx={{ 
                mb: 3,
                p: 2,
                borderRadius: 1,
                bgcolor: 'rgba(30, 136, 229, 0.1)',
                border: '1px solid rgba(30, 136, 229, 0.2)'
              }}
            >
              <Typography variant="overline" color="info.light" sx={{ display: 'block', mb: 1 }}>
                Details
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {poi.description || 'No description'}
              </Typography>
            </Box>

            {/* Photos */}
            {poi.photos && poi.photos.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Photos ({poi.photos.length})
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1
                }}>
                  {poi.photos.map((photo, index) => (
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
          </DrawerContent>
        </Box>
      </NestedDrawer>

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
