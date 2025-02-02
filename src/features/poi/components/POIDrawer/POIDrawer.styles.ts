import { styled } from '@mui/material/styles';
import { Paper, Box, IconButton, Typography, List, ListItem } from '@mui/material';

export const StyledDrawer = styled(Box)(({ theme }) => ({
  width: '264px',
  height: '100%',
  backgroundColor: 'rgba(35, 35, 35, 0.9)',
  display: 'flex',
  flexDirection: 'column',
}));

export const DrawerHeader = styled(Box)(({ theme }) => ({
  padding: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
}));

export const DrawerContent = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
}));

export const DrawerFooter = styled(Box)(({ theme }) => ({
  padding: '16px',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '8px',
}));

export const ModeSelectionCard = styled(Paper)(({ theme }) => ({
  padding: '16px',
  marginBottom: '12px',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: 'rgba(45, 45, 45, 0.9)',
    transform: 'translateY(-2px)',
  },
}));

export const CategoryList = styled(List)(({ theme }) => ({
  padding: 0,
  marginBottom: '16px',
}));

export const CategoryItem = styled(ListItem)<{ selected?: boolean }>(({ theme, selected }) => ({
  padding: '8px 12px',
  marginBottom: '8px',
  backgroundColor: selected ? 'rgba(55, 55, 55, 0.9)' : 'rgba(35, 35, 35, 0.9)',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: 'rgba(45, 45, 45, 0.9)',
  },
}));

export const IconGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(6, 1fr)',
  gap: '12px',
  padding: '4px 0',
  justifyItems: 'center',
}));

export const IconGridItem = styled(Box)<{ selected?: boolean; zoom?: number }>(({ theme, selected, zoom }) => ({
  aspectRatio: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  background: 'none',
  border: 'none',
  ...(selected && {
    transform: 'scale(1.1)'
  }),
  ...(zoom === 3 && { transform: 'scale(0.5)' }),
  ...(zoom === 4 && { transform: 'scale(0.5)' }),
  ...(zoom === 5 && { transform: 'scale(0.6)' }),
  ...(zoom === 6 && { transform: 'scale(0.6)' }),
  ...(zoom === 7 && { transform: 'scale(0.7)' }),
  ...(zoom === 8 && { transform: 'scale(0.7)' }),
  ...(zoom === 9 && { transform: 'scale(0.8)' }),
  ...(zoom === 10 && { transform: 'scale(0.8)' }),
  ...(zoom === 11 && { transform: 'scale(0.9)' }),
  ...(zoom === 12 && { transform: 'scale(0.9)' }),
  ...(zoom === 13 && { transform: 'scale(1.0)' }),
  ...(zoom === 14 && { transform: 'scale(1.0)' })
}));

export const StyledForm = styled('form')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}));

export const PhotoPreviewGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  marginTop: '8px',
}));

export const PhotoPreview = styled(Box)(({ theme }) => ({
  aspectRatio: '1',
  position: 'relative',
  borderRadius: '4px',
  overflow: 'hidden',
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
}));

export const DeletePhotoButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '4px',
  right: '4px',
  padding: '4px',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
}));

export const InstructionsBox = styled(Box)(({ theme }) => ({
  padding: '16px',
  backgroundColor: 'rgba(45, 45, 45, 0.9)',
  borderRadius: '4px',
  marginBottom: '16px',
}));

export const InstructionsText = styled(Typography)(({ theme }) => ({
  marginBottom: '8px',
  color: 'rgba(255, 255, 255, 0.87)',
}));

export const StyledTooltip = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#000000',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 1000,
}));
