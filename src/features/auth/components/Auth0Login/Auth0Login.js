import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './Auth0Login.css';
import { UserProfileModal } from '../UserProfileModal/UserProfileModal.jsx';

export const Auth0Login = () => {
    const { loginWithRedirect, logout, user, isAuthenticated, isLoading, error } = useAuth0();
    const [imageError, setImageError] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    
    if (isLoading) {
        return (_jsx("div", { className: "auth0-login", children: _jsx("div", { className: "auth0-loading", children: "Loading..." }) }));
    }
    
    if (error) {
        console.error('Auth0 error:', error);
    }
    
    const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23666'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";
    
    const profilePicture = isAuthenticated && user?.picture && !imageError
        ? user.picture
        : defaultAvatar;
    
    const handleAvatarClick = () => {
        if (isAuthenticated) {
            // Open profile modal instead of logging out
            setProfileModalOpen(true);
        } else {
            loginWithRedirect();
        }
    };
    
    return (_jsxs("div", { className: "auth0-login", children: [
            _jsx("img", { 
                src: profilePicture, 
                alt: isAuthenticated ? user?.name : "Login", 
                className: "auth0-avatar", 
                onClick: handleAvatarClick, 
                title: isAuthenticated ? "Click to edit profile" : "Click to login", 
                style: { cursor: 'pointer', backgroundColor: '#2a2a2a' }, 
                onError: () => setImageError(true) 
            }),
            isAuthenticated ? 
                _jsx("i", { className: "fa-solid fa-circle-check auth-status-indicator logged-in", title: "Logged in" }) : 
                _jsx("i", { className: "fa-solid fa-circle-xmark auth-status-indicator logged-out", title: "Logged out" }),
            
            /* Profile Modal */
            isAuthenticated && _jsx(UserProfileModal, {
                open: profileModalOpen,
                onClose: () => setProfileModalOpen(false)
            })
        ] }));
};

export default Auth0Login;
