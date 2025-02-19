import React from 'react';
import { Snackbar, Alert } from '@mui/material';

interface AuthAlertProps {
  show: boolean;
  onClose: () => void;
}

export function AuthAlert({ show, onClose }: AuthAlertProps) {
  return (
    <Snackbar
      open={show}
      autoHideDuration={5000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert 
        onClose={onClose}
        severity="error"
        variant="filled"
        sx={{ 
          width: '100%',
          backgroundColor: 'rgb(22, 11, 11)',
          color: '#fff',
          '& .MuiAlert-icon': {
            color: '#f44336'
          }
        }}
      >
        Please sign in to create or modify routes
      </Alert>
    </Snackbar>
  );
}
