import { styled } from '@mui/material/styles';
import { Box, Paper, IconButton, Typography, List, ListItem } from '@mui/material';

export const StyledDrawer = styled(Box)(({ theme }) => ({
  width: '264px',
  height: '100%',
  backgroundColor: 'rgb(35, 35, 35)',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  boxSizing: 'border-box'
}));

export const DrawerHeader = styled(Box)(({ theme }) => ({
  padding: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
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
  borderTop: '1px solid rgba(255, 255, 255, 0.2)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '4px',
}));

export const DirectionGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  padding: '8px 0',
}));

export const DirectionButton = styled(Box)(({ theme, selected }) => ({
  aspectRatio: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: selected ? 'rgba(74, 158, 255, 0.2)' : 'rgba(35, 35, 35, 0.9)',
  border: selected ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '4px',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: selected ? 'rgba(74, 158, 255, 0.3)' : 'rgba(45, 45, 45, 0.95)',
    transform: 'scale(1.05)',
  },
  color: 'white',
  fontSize: '16px',
}));

export const ColorGrid = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  padding: '8px 0',
}));

export const ColorButton = styled(Box)(({ theme, color, selected }) => ({
  width: '32px',
  height: '32px',
  backgroundColor: color,
  borderRadius: '4px',
  cursor: 'pointer',
  border: selected ? '2px solid white' : '1px solid rgba(255, 255, 255, 0.3)',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.1)',
  }
}));

export const IconGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: '8px',
  padding: '8px 0',
}));

export const StyledIconButton = styled(Box)(({ theme, selected }) => ({
  aspectRatio: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: selected ? 'rgba(74, 158, 255, 0.2)' : 'rgba(35, 35, 35, 0.9)',
  border: selected ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '4px',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: selected ? 'rgba(74, 158, 255, 0.3)' : 'rgba(45, 45, 45, 0.95)',
    transform: 'scale(1.05)',
  },
  color: 'white',
}));

export const PreviewContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '16px',
  backgroundColor: 'rgba(25, 25, 25, 0.5)',
  borderRadius: '4px',
  minHeight: '100px',
}));

// Tab component with pointer
export const Tab = styled(Box, {
  shouldForwardProp: (prop) => !['pointerDirection', 'backgroundColor'].includes(prop)
})(({ theme, pointerDirection, backgroundColor = '#1a1a1a' }) => {
  const baseStyles = {
    position: 'relative',
    backgroundColor,
    color: backgroundColor === '#ffffff' ? 'black' : 'white',
    padding: '10px 14px',
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    maxWidth: '240px',
  };

  // Pointer styles based on direction
  const pointerStyles = {};
  const pointerSize = '12px';

  switch (pointerDirection) {
    case 'top':
      pointerStyles['&::before'] = {
        content: '""',
        position: 'absolute',
        top: `-${pointerSize}`,
        left: '50%',
        transform: 'translateX(-50%)',
        borderLeft: `${pointerSize} solid transparent`,
        borderRight: `${pointerSize} solid transparent`,
        borderBottom: `${pointerSize} solid ${backgroundColor}`,
      };
      break;
    case 'right':
      pointerStyles['&::after'] = {
        content: '""',
        position: 'absolute',
        right: `-${pointerSize}`,
        top: '50%',
        transform: 'translateY(-50%)',
        borderTop: `${pointerSize} solid transparent`,
        borderBottom: `${pointerSize} solid transparent`,
        borderLeft: `${pointerSize} solid ${backgroundColor}`,
      };
      break;
    case 'bottom':
      pointerStyles['&::after'] = {
        content: '""',
        position: 'absolute',
        bottom: `-${pointerSize}`,
        left: '50%',
        transform: 'translateX(-50%)',
        borderLeft: `${pointerSize} solid transparent`,
        borderRight: `${pointerSize} solid transparent`,
        borderTop: `${pointerSize} solid ${backgroundColor}`,
      };
      break;
    case 'left':
      pointerStyles['&::before'] = {
        content: '""',
        position: 'absolute',
        left: `-${pointerSize}`,
        top: '50%',
        transform: 'translateY(-50%)',
        borderTop: `${pointerSize} solid transparent`,
        borderBottom: `${pointerSize} solid transparent`,
        borderRight: `${pointerSize} solid ${backgroundColor}`,
      };
      break;
    case 'top-right':
      pointerStyles['&::before'] = {
        content: '""',
        position: 'absolute',
        top: `-${pointerSize}`,
        right: `${pointerSize}`,
        borderLeft: `${pointerSize} solid transparent`,
        borderBottom: `${pointerSize} solid ${backgroundColor}`,
        borderRight: '0px solid transparent',
      };
      break;
    case 'top-left':
      pointerStyles['&::before'] = {
        content: '""',
        position: 'absolute',
        top: `-${pointerSize}`,
        left: `${pointerSize}`,
        borderRight: `${pointerSize} solid transparent`,
        borderBottom: `${pointerSize} solid ${backgroundColor}`,
        borderLeft: '0px solid transparent',
      };
      break;
    case 'bottom-right':
      pointerStyles['&::after'] = {
        content: '""',
        position: 'absolute',
        bottom: `-${pointerSize}`,
        right: `${pointerSize}`,
        borderLeft: `${pointerSize} solid transparent`,
        borderTop: `${pointerSize} solid ${backgroundColor}`,
        borderRight: '0px solid transparent',
      };
      break;
    case 'bottom-left':
      pointerStyles['&::after'] = {
        content: '""',
        position: 'absolute',
        bottom: `-${pointerSize}`,
        left: `${pointerSize}`,
        borderRight: `${pointerSize} solid transparent`,
        borderTop: `${pointerSize} solid ${backgroundColor}`,
        borderLeft: '0px solid transparent',
      };
      break;
    default:
      // Default to right pointer
      pointerStyles['&::after'] = {
        content: '""',
        position: 'absolute',
        right: `-${pointerSize}`,
        top: '50%',
        transform: 'translateY(-50%)',
        borderTop: `${pointerSize} solid transparent`,
        borderBottom: `${pointerSize} solid transparent`,
        borderLeft: `${pointerSize} solid ${backgroundColor}`,
      };
  }

  return {
    ...baseStyles,
    ...pointerStyles
  };
});
