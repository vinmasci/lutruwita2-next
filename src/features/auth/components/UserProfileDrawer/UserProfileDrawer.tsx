import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './UserProfileDrawer.css';
import { clearStoredAuthentication } from '../../utils/authUtils';

interface UserProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  token?: string;
}

const UserProfileDrawer: React.FC<UserProfileDrawerProps> = ({ isOpen, onClose, user, token }) => {
  const { logout } = useAuth0();

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    // Clear stored authentication data
    clearStoredAuthentication();
    
    // Use Auth0 logout with redirect to landing page
    logout({ logoutParams: { returnTo: window.location.origin + '/' } });
    
    // Close the drawer
    onClose();
  };

  return (
    <div className={`user-profile-drawer ${isOpen ? 'open' : ''}`}>
      <div className="drawer-header">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>User Profile</h2>
      </div>
      
      <div className="profile-content">
        <div className="profile-image-container">
          {user.picture ? (
            <img 
              src={user.picture} 
              alt={user.name} 
              className="profile-image"
              onError={(e) => {
                // If image fails to load, show initials
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
          
          {/* Fallback to initials if no picture or picture fails to load */}
          <div className="profile-initials">
            {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : '?'}
          </div>
        </div>
        
        <div className="profile-details">
          <h3>{user.name}</h3>
          <p className="email">{user.email}</p>
          
          {user.nickname && <p className="detail-item"><span>Nickname:</span> {user.nickname}</p>}
          {user.given_name && <p className="detail-item"><span>First Name:</span> {user.given_name}</p>}
          {user.family_name && <p className="detail-item"><span>Last Name:</span> {user.family_name}</p>}
          
          <div className="token-section">
            <p className="token-label">Access Token:</p>
            <div className="token-display">
              {token ? (
                <div className="token-truncated">
                  {`${token.substring(0, 15)}...${token.substring(token.length - 10)}`}
                </div>
              ) : (
                <div className="token-unavailable">Token not available</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="drawer-footer">
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileDrawer;
