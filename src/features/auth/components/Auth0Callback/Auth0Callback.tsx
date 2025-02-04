import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

export const Auth0Callback: React.FC = () => {
  const { isAuthenticated, error, user } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Auth0Callback State:', {
      isAuthenticated,
      error: error?.message,
      user,
      currentPath: window.location.pathname
    });

    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, error, user]);

  if (error) {
    console.error('Auth0Callback Error:', error);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div>Authentication error</div>
        <div>{error.message}</div>
        <button onClick={() => navigate('/', { replace: true })}>Return to Home</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div>Processing authentication...</div>
    </div>
  );
};

export default Auth0Callback;
