import React from 'react';
import { Snackbar, Alert } from '@mui/material';

interface SurfaceProcessingAlertProps {
  show: boolean;
  onClose: () => void;
}

export function SurfaceProcessingAlert({ show, onClose }: SurfaceProcessingAlertProps) {
  return (
    <Snackbar
      open={show}
      autoHideDuration={null} // Don't auto-hide since processing might take a while
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert 
        onClose={onClose}
        severity="info"
        variant="filled"
        sx={{ 
          width: '100%',
          backgroundColor: '#1e3a8a', // Dark blue background
          color: '#fff',
          '& .MuiAlert-icon': {
            color: '#93c5fd' // Light blue icon
          }
        }}
        component="div"
      >
        Processing surface data, that may take a little while depending on the size of your photo
      </Alert>
    </Snackbar>
  );
}
