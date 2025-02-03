import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './Auth0Login.css';

export const Auth0Login: React.FC = () => {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="auth0-login">
        <div className="auth0-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="auth0-login">
      {isAuthenticated ? (
        <div className="auth0-user">
          <img src={user?.picture} alt={user?.name} className="auth0-avatar" />
          <div className="auth0-info">
            <div className="auth0-name">{user?.name}</div>
            <button 
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="auth0-button"
            >
              Log Out
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => loginWithRedirect()} className="auth0-button">
          Log In
        </button>
      )}
    </div>
  );
};

export default Auth0Login;
