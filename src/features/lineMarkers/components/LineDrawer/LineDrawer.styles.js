import { styled } from '@mui/material/styles';

export const IconGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(24px, 1fr))',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1)
}));

export const IconGridItem = styled('div', {
  shouldForwardProp: prop => prop !== 'selected'
})(({ theme, selected }) => ({
  cursor: 'pointer',
  padding: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  border: `2px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
  transition: theme.transitions.create(['transform', 'border-color']),
  '&:hover': {
    transform: 'scale(1.1)',
    borderColor: theme.palette.primary.main
  }
}));

export const StyledTooltip = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: 'white',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  whiteSpace: 'nowrap',
  zIndex: 1000,
  marginTop: '4px'
}));
