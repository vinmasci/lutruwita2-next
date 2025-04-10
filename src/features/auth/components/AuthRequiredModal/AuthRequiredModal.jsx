import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box 
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import LockIcon from '@mui/icons-material/Lock';

/**
 * A modal dialog that appears when authentication is required
 * Provides options to sign in directly or cancel
 */
export const AuthRequiredModal = ({ open, onClose, message }) => {
  const { loginWithRedirect, loginWithPopup } = useAuth0();

  const handleSignIn = async () => {
    try {
      // Use popup mode instead of redirect
      await loginWithPopup({
        appState: { returnTo: window.location.pathname },
        // Configure popup window
        popup: {
          width: 400,
          height: 600,
          left: window.innerWidth / 2 - 200,
          top: window.innerHeight / 2 - 300
        }
      });
      onClose(); // Close the modal after successful login
    } catch (error) {
      console.error('Auth0 popup login error:', error);
      // If popup is blocked or fails, fallback to redirect
      if (error.error === 'popup_closed_by_user' || error.error === 'login_required') {
        console.log('Popup was blocked or closed, falling back to redirect');
        loginWithRedirect({
          appState: { returnTo: window.location.pathname }
        });
        onClose();
      }
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: 'rgb(35, 35, 35)',
          color: 'white',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '100%'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, fontSize: '1.5rem', fontWeight: 500, textAlign: 'center' }}>
        Authentication Required
      </DialogTitle>
      
      <DialogContent sx={{ pt: '8px !important' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              backgroundColor: 'rgba(25, 118, 210, 0.1)', 
              borderRadius: '50%',
              p: 2,
              mb: 2
            }}
          >
            <LockIcon sx={{ fontSize: 40, color: '#1976d2' }} />
          </Box>
          
          <Typography variant="body1" sx={{ textAlign: 'center', mb: 1 }}>
            {message || 'You need to be signed in to access this feature.'}
          </Typography>
          
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
            Sign in to save your routes, load existing routes, and access all features.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button 
          onClick={onClose} 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' }
          }}
        >
          Cancel
        </Button>
        
        <Button 
          onClick={handleSignIn} 
          variant="contained"
          sx={{ 
            backgroundColor: '#1976d2',
            '&:hover': { backgroundColor: '#2196f3' }
          }}
        >
          Sign In
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuthRequiredModal;
