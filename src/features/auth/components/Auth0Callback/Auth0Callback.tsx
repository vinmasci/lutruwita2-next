import React, { useEffect, useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { storeAuthentication } from '../../utils/authUtils';

export const Auth0Callback: React.FC = () => {
  const { isAuthenticated, error, user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingStep, setProcessingStep] = useState('Initializing authentication...');
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  
  // Use a ref to track if we've already processed this authentication
  const hasProcessedAuth = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add a timer to show how long we've been processing
  useEffect(() => {
    const interval = setInterval(() => {
      setProcessingTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Set a timeout to force navigation if authentication takes too long
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isProcessing) {
        setTimeoutOccurred(true);
        setProcessingStep('Authentication is taking longer than expected.');
      }
    }, 10000); // 10 seconds timeout
    
    return () => clearTimeout(timeout);
  }, [isProcessing]);

  // Handle the authentication process
  useEffect(() => {
    // Clear any existing redirect timeout when this effect runs
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    
    // Only process once to prevent loops
    if (hasProcessedAuth.current) {
      return;
    }
    
    const handleAuthentication = async () => {
      try {
        console.log('Auth0Callback: Starting authentication process');
        
        // Check if we have Auth0 authentication parameters in the URL
        const params = new URLSearchParams(location.search);
        const hasAuthParams = params.has('code') && params.has('state');
        
        if (!hasAuthParams) {
          // No Auth0 parameters, redirect to home
          console.log('Auth0Callback: No authentication parameters found');
          setProcessingStep('No authentication parameters found, redirecting...');
          redirectTimeoutRef.current = setTimeout(() => {
            navigate('/', { replace: true });
          }, 1000);
          return;
        }
        
        setProcessingStep('Processing authentication response...');
        
        if (error) {
          // Auth0 error occurred
          console.error('Auth0Callback: Authentication error:', error);
          setProcessingStep(`Authentication error: ${error.message}`);
          setIsProcessing(false);
          return;
        }
        
        if (isAuthenticated && user) {
          // User is authenticated, get token and store in localStorage
          console.log('Auth0Callback: User authenticated, getting token');
          setProcessingStep('Authentication successful, getting token...');
          
          try {
            const token = await getAccessTokenSilently();
            console.log('Auth0Callback: Got token, storing authentication data');
            
            // Store authentication data using the utility function
            storeAuthentication(user, token);
            
            // Mark as processed to prevent loops
            hasProcessedAuth.current = true;
            
            setProcessingStep('Authentication complete, redirecting...');
            
            // Redirect to landing page
            redirectTimeoutRef.current = setTimeout(() => {
              console.log('Auth0Callback: Redirecting to landing page');
              window.location.href = '/'; // Use window.location for a full page reload
            }, 1000);
          } catch (tokenError: any) {
            console.error('Auth0Callback: Error getting access token:', tokenError);
            setProcessingStep(`Error getting access token: ${tokenError?.message || 'Unknown error'}`);
            setIsProcessing(false);
          }
        } else if (processingTime > 8) {
          // If we've been waiting for more than 8 seconds and still not authenticated,
          // force redirect to home
          console.log('Auth0Callback: Timeout waiting for authentication, redirecting anyway');
          setProcessingStep('Timeout waiting for authentication, redirecting...');
          
          // Mark as processed to prevent loops
          hasProcessedAuth.current = true;
          
          // Force redirect to home with a full page reload
          redirectTimeoutRef.current = setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        }
      } catch (err: any) {
        console.error('Auth0Callback: Error in authentication process:', err);
        setProcessingStep(`Authentication process error: ${err?.message || 'Unknown error'}`);
        setIsProcessing(false);
      }
    };
    
    handleAuthentication();
    
    // Cleanup function
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user, error, navigate, getAccessTokenSilently, processingTime, location.search]);

  // Handle manual navigation with a full page reload
  const handleManualNavigation = () => {
    window.location.href = '/';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        bgcolor: '#1a1a1a',
        color: 'white',
        padding: 3,
        textAlign: 'center'
      }}
    >
      <Typography variant="h4" gutterBottom>
        Authentication in Progress
      </Typography>
      
      <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {isProcessing && <CircularProgress size={60} sx={{ mb: 2 }} />}
        
        <Typography variant="body1" sx={{ mb: 2 }}>
          {processingStep}
        </Typography>
        
        {processingTime > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Time elapsed: {processingTime} seconds
          </Typography>
        )}
        
        {(timeoutOccurred || !isProcessing || processingTime > 15) && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              {error ? `Error: ${error.message}` : 'Authentication is taking longer than expected.'}
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleManualNavigation}
              sx={{ mt: 2 }}
            >
              Return to Home
            </Button>
          </Box>
        )}
      </Box>
      
      {/* Debug information (only visible in development) */}
      {import.meta.env.DEV && (
        <Box sx={{ mt: 4, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1, maxWidth: '100%', overflow: 'auto' }}>
          <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify({ isAuthenticated, user, error, processingTime }, null, 2)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Auth0Callback;
