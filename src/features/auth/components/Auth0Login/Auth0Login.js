import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Auth0Login.css';
import { UserProfileModal } from '../UserProfileModal/UserProfileModal.jsx';

export const Auth0Login = () => {
    // Use our custom auth context instead of Auth0 directly
    const { login, logout, user, isAuthenticated, isLoading, authError, checkAuthentication } = useAuth();
    const [imageError, setImageError] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    
    // Check authentication status periodically
    useEffect(() => {
        // Check authentication on mount
        checkAuthentication();
        
        // Set up periodic check (every 2 minutes)
        const checkInterval = setInterval(() => {
            checkAuthentication();
        }, 2 * 60 * 1000);
        
        // Clean up interval on unmount
        return () => {
            clearInterval(checkInterval);
        };
    }, [checkAuthentication]);
    
    // Update status message when auth error occurs
    useEffect(() => {
        if (authError) {
            setStatusMessage(authError);
            // Clear the message after 5 seconds
            const timeout = setTimeout(() => {
                setStatusMessage('');
            }, 5000);
            
            return () => {
                clearTimeout(timeout);
            };
        }
    }, [authError]);
    
    if (isLoading) {
        return React.createElement(
            "div", 
            { className: "auth0-login" }, 
            React.createElement("div", { className: "auth0-loading" }, "Loading...")
        );
    }
    
    if (authError) {
        console.error('Auth error:', authError);
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
            login();
        }
    };
    
    return React.createElement(
        "div", 
        { className: "auth0-login" }, 
        [
            // Avatar image
            React.createElement("img", { 
                key: "avatar",
                src: profilePicture, 
                alt: isAuthenticated ? user?.name : "Login", 
                className: "auth0-avatar", 
                onClick: handleAvatarClick, 
                title: isAuthenticated ? "Click to edit profile" : "Click to login", 
                style: { cursor: 'pointer', backgroundColor: '#2a2a2a' }, 
                onError: () => setImageError(true) 
            }),
            
            // Status indicator
            isAuthenticated ? 
                React.createElement("i", { 
                    key: "status-logged-in",
                    className: "fa-solid fa-circle-check auth-status-indicator logged-in", 
                    title: "Logged in" 
                }) : 
                React.createElement("i", { 
                    key: "status-logged-out",
                    className: "fa-solid fa-circle-xmark auth-status-indicator logged-out", 
                    title: "Logged out" 
                }),
            
            // Status message
            statusMessage && React.createElement(
                "div", 
                { 
                    key: "status-message",
                    className: "auth-status-message", 
                    style: { 
                        position: 'absolute', 
                        top: '100%', 
                        right: 0, 
                        backgroundColor: '#f44336', 
                        color: 'white', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        zIndex: 1000
                    }
                }, 
                statusMessage
            ),
            
            // Profile Modal
            isAuthenticated && React.createElement(
                UserProfileModal, 
                {
                    key: "profile-modal",
                    open: profileModalOpen,
                    onClose: () => setProfileModalOpen(false)
                }
            )
        ].filter(Boolean) // Filter out falsy values
    );
};

export default Auth0Login;
