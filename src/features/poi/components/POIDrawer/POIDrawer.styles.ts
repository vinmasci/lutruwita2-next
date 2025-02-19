import { styled } from '@mui/material/styles';
import { Paper, Box, IconButton, Typography, List, ListItem } from '@mui/material';

export const StyledDrawer = styled(Box)(({ theme }) => ({
  width: '264px',
  height: '100%',
  backgroundColor: 'rgb(35, 35, 35)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  padding: '16px',
  boxSizing: 'border-box',
}));

export const DrawerHeader = styled(Box)(({ theme }) => ({
  padding: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgb(255, 255, 255)',
  width: '100%',
  boxSizing: 'border-box',
}));

export const DrawerContent = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  width: '100%',
  boxSizing: 'border-box',
  '& > *': {
    maxWidth: '232px', // 264px - 32px (padding)
    wordWrap: 'break-word'
  }
}));

export const DrawerFooter = styled(Box)(({ theme }) => ({
  padding: '16px',
  borderTop: '1px solid rgb(255, 255, 255)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '4px',
}));

export const ModeSelectionCard = styled(Paper)(({ theme }) => ({
  padding: '16px',
  marginBottom: '12px',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  width: '100%',
  boxSizing: 'border-box',
  '& > div': {
    maxWidth: '100%',
    wordWrap: 'break-word'
  },
  '&:hover': {
    backgroundColor: 'rgb(45, 45, 45)',
    transform: 'translateY(-2px)',
  },
}));

export const CategoryList = styled(List)(({ theme }) => ({
  padding: 0,
  marginBottom: '16px',
}));

export const CategoryItem = styled(ListItem)<{ selected?: boolean }>(({ theme, selected }) => ({
  padding: '4px 12px',
  marginBottom: '8px',
  backgroundColor: selected ? 'rgb(55, 55, 55)' : 'rgb(35, 35, 35)',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: 'rgb(45, 45, 45)',
  },
}));

export const IconGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(9, 1fr)',
  gap: '6px',
  padding: '0px 0px',
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
  backgroundColor: 'rgb(0, 0, 0)',
  '&:hover': {
    backgroundColor: 'rgb(0, 0, 0)',
  },
}));

export const InstructionsBox = styled(Box)(({ theme }) => ({
  padding: '16px',
  backgroundColor: 'rgb(45, 45, 45)',
  borderRadius: '4px',
  marginBottom: '16px',
}));

export const InstructionsText = styled(Typography)(({ theme }) => ({
  marginBottom: '8px',
  color: 'rgb(255, 255, 255)',
}));

export const StyledTooltip = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#000000',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
  fontWeight: 500,
  lineHeight: '1.4em',
  letterSpacing: '0.15px',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 1000,
}));
