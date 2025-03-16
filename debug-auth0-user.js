import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';

// Debug component to display Auth0 user information
function Auth0Debug() {
  const { user, isAuthenticated, isLoading, error } = useAuth0();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Auth0 Debug</h1>
      <div>
        <h2>Authentication Status</h2>
        <p>isAuthenticated: {isAuthenticated ? 'true' : 'false'}</p>
      </div>
      
      {isAuthenticated && (
        <div>
          <h2>User Object</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', overflow: 'auto' }}>
            {JSON.stringify(user, null, 2)}
          </pre>
          
          <h2>Important User Properties</h2>
          <ul>
            <li>user.sub: {user?.sub || 'undefined'}</li>
            <li>user.name: {user?.name || 'undefined'}</li>
            <li>user.email: {user?.email || 'undefined'}</li>
            <li>user.picture: {user?.picture || 'undefined'}</li>
          </ul>
          
          <h2>All User Keys</h2>
          <ul>
            {user ? Object.keys(user).map(key => (
              <li key={key}>{key}: {typeof user[key] === 'object' ? JSON.stringify(user[key]) : user[key]}</li>
            )) : 'No user object'}
          </ul>
        </div>
      )}
      
      <div>
        <h2>Local Storage Auth0 Data</h2>
        <button onClick={() => {
          try {
            const auth0Data = JSON.parse(localStorage.getItem('auth0spa') || '{}');
            console.log('Auth0 localStorage data:', auth0Data);
            alert('Auth0 data logged to console');
          } catch (error) {
            console.error('Error parsing Auth0 data:', error);
            alert('Error: ' + error.message);
          }
        }}>
          Log Auth0 localStorage Data
        </button>
      </div>
    </div>
  );
}

// Main App
function App() {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN || 'dev-8jmwfh4hugvdjwh8.au.auth0.com'}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID || 'hLnq0z7KNvwcORjFF9KdC4kGPtu51kVB'}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: 'https://dev-8jmwfh4hugvdjwh8.au.auth0.com/api/v2/',
        scope: 'openid profile email offline_access'
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <Auth0Debug />
    </Auth0Provider>
  );
}

// Create a simple HTML structure
const rootElement = document.createElement('div');
rootElement.id = 'root';
document.body.appendChild(rootElement);

// Render the app
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
