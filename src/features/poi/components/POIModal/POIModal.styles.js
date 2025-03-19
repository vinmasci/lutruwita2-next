import { styled } from '@mui/material/styles';
import { Box, Paper } from '@mui/material';

export const ModalContent = styled(Box)(({ theme }) => ({
  padding: '16px',
  overflowY: 'auto',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

export const ModalPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgb(35, 35, 35)',
  color: 'white',
  maxHeight: '80vh',
  borderRadius: '8px',
}));

export const ModalHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
}));

export const ModalFooter = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  padding: '16px',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  gap: '8px',
}));

export const IconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '16px',
}));
