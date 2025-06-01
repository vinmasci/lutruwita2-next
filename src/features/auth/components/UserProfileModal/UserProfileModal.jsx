import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button, 
  Avatar, 
  Box, 
  Typography, 
  CircularProgress,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import LogoutIcon from '@mui/icons-material/Logout';
import CloseIcon from '@mui/icons-material/Close';
import './UserProfileModal.css';

export const UserProfileModal = ({ open, onClose }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth0();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    website: '',
    picture: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Debug Auth0 user information
  useEffect(() => {
    console.log('Auth0 User Information:');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isLoading:', isLoading);
    console.log('user object:', user);
    console.log('user?.sub:', user?.sub);
    
    // Log localStorage auth0 data
    try {
      const auth0Data = JSON.parse(localStorage.getItem('auth0spa') || '{}');
      console.log('Auth0 localStorage data:', auth0Data);
      console.log('Auth0 User ID from localStorage:', auth0Data.body?.decodedToken?.user?.sub);
    } catch (error) {
      console.error('Error parsing Auth0 localStorage data:', error);
    }
  }, [isAuthenticated, isLoading, user]);

  // Load user data when modal opens - check MongoDB first, then fall back to Auth0
  useEffect(() => {
    const loadUserData = async () => {
      if (open && isAuthenticated && user) {
        try {
          // Import the userService dynamically to avoid circular dependencies
          console.log('[DEBUG] Importing userService for data fetch...');
          const { fetchUserData } = await import('../../services/userService');
          console.log('[DEBUG] userService imported successfully');
          
          // Use the known user ID from route saving if user.sub is undefined
          const userId = user?.sub || "google-oauth2|104387414892803104975";
          console.log('[DEBUG] Fetching user data for:', userId);
          
          // Try to fetch user data from MongoDB
          const userData = await fetchUserData(userId);
          console.log('[DEBUG] User data fetched from MongoDB:', userData);
          
          if (userData) {
            // Initialize form with data from MongoDB
            console.log('[DEBUG] Initializing form with MongoDB user data');
            setFormData({
              name: userData.name || '',
              email: userData.email || '',
              website: userData.website || '',
              picture: userData.picture || user?.picture || '',
              username: userData.nickname || ''
            });
            return;
          }
        } catch (error) {
          console.error('[DEBUG] Error fetching user data from MongoDB:', error);
          // Fall back to Auth0 data
        }
        
        // If we couldn't get data from MongoDB or there was an error, use Auth0 data
        console.log('[DEBUG] Initializing form with Auth0 user data:', user);
        setFormData({
          name: user.name || '',
          email: user.email || '',
          website: user.website || '',
          picture: user.picture || '',
          username: user.nickname || ''
        });
      } else {
        console.log('Not initializing form - conditions not met:', { open, isAuthenticated, hasUser: !!user });
      }
    };
    
    loadUserData();
  }, [open, isAuthenticated, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      console.log('Not submitting - not authenticated');
      return;
    }
    
    try {
      setLoading(true);
      
      // Use the known user ID from route saving if user.sub is undefined
      const userId = user?.sub || "google-oauth2|104387414892803104975";
      console.log('[DEBUG] Using userId for updateUserData:', userId);
      
      // Import the userService dynamically to avoid circular dependencies
      console.log('[DEBUG] Importing userService...');
      const { updateUserData } = await import('../../services/userService');
      console.log('[DEBUG] userService imported successfully');
      
      console.log('[DEBUG] Submitting user data to API:', { userId, ...formData });
      
      // Log the actual fetch request details
      console.log('[DEBUG] About to make fetch request to /api/user with method POST');
      console.log('[DEBUG] This is where user data will be checked/created in MongoDB');
      
      // Add a timestamp to track how long the API call takes
      const startTime = new Date().getTime();
      console.log(`[DEBUG] API call started at: ${new Date().toISOString()}`);
      
      const result = await updateUserData({
        userId: userId,
        ...formData
      });
      
      const endTime = new Date().getTime();
      console.log(`[DEBUG] API call completed in ${endTime - startTime}ms`);
      console.log('[DEBUG] User data update result:', result);
      
      setSnackbar({
        open: true,
        message: 'Profile updated successfully!',
        severity: 'success'
      });
      
      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update profile. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        className="user-profile-modal"
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Edit Profile</Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3, mt: 1 }}>
            <Avatar 
              src={formData.picture || user?.picture} 
              alt={formData.name || user?.name || 'User'} 
              sx={{ width: 80, height: 80, mb: 2 }}
            />
            <Typography variant="body2" color="textSecondary">
              Profile picture is saved from your Google account
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
            />
            
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              placeholder="e.g., mascivincent"
            />
            
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              disabled
              helperText="Email is managed by your Google account"
            />
            
            <TextField
              fullWidth
              label="Website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              placeholder="e.g., https://example.com"
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button 
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            color="error"
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
          
          <Box>
            <Button onClick={onClose} color="primary" sx={{ mr: 1 }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              color="primary" 
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      
      {ReactDOM.createPortal(
        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ 
            position: 'fixed',
            zIndex: 9999,
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>,
        document.body
      )}
    </>
  );
};

export default UserProfileModal;
