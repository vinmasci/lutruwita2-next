import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Tooltip } from '@mui/material';
import { Home, Map, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useRouteContext } from '../../context/RouteContext';

/**
 * MapHeader component displays a header bar with the route title and attribution
 * Attribution can be either a username or a logo
 */
const MapHeader = ({ title, color = '#000000', logoUrl, username }) => {
    // Get the updateHeaderSettings function and headerSettings from RouteContext
    const { updateHeaderSettings, headerSettings } = useRouteContext();
    
    // Function to clear the logo
    const handleClearLogo = () => {
        // Get the current logo URL and public ID from the props
        const { logoUrl, logoPublicId } = headerSettings;
        
        // Clear the logo URL and public ID in the context immediately
        updateHeaderSettings({ 
            logoUrl: null,
            logoPublicId: null
        });
        
        // If we have a public ID or URL, try to delete the logo from Cloudinary
        if (logoPublicId || (logoUrl && !logoUrl.startsWith('blob:'))) {
            // Use a separate function to handle the async deletion
            // This avoids React hook rules violations
            deleteLogoFromCloudinary(logoUrl, logoPublicId);
        }
    };
    
    // Separate function to handle the async deletion
    const deleteLogoFromCloudinary = async (logoUrl, logoPublicId) => {
        try {
            // Import axios
            const axios = (await import('axios')).default;
            
            // Extract public ID from URL if we don't have it directly
            let publicId = logoPublicId;
            if (!publicId && logoUrl && !logoUrl.startsWith('blob:')) {
                // Try to extract from URL
                // Cloudinary URLs are typically in the format:
                // https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
                const urlObj = new URL(logoUrl);
                const pathParts = urlObj.pathname.split('/');
                // The public ID is everything after /upload/vXXXXXXXXXX/
                const uploadIndex = pathParts.findIndex(part => part === 'upload');
                if (uploadIndex !== -1 && uploadIndex + 2 < pathParts.length) {
                    // Skip the version part (vXXXXXXXXXX)
                    publicId = pathParts.slice(uploadIndex + 2).join('/');
                    console.log('Extracted public ID from URL:', publicId);
                }
            }
            
            if (publicId) {
                console.log('Deleting logo from Cloudinary with public ID:', publicId);
                
                // Use the photos endpoint with DELETE method for deleting files
                try {
                    // Import the deleteFromCloudinary utility function
                    const { deleteFromCloudinary } = await import('../../../../utils/cloudinary');
                    
                    // Use the utility function which handles the API call correctly
                    const success = await deleteFromCloudinary(publicId);
                    
                    if (success) {
                        console.log('Successfully deleted logo from Cloudinary:', publicId);
                    } else {
                        console.error('Failed to delete logo from Cloudinary:', publicId);
                    }
                } catch (error) {
                    console.error('Error deleting logo from Cloudinary:', error.message);
                    if (error.response) {
                        console.error('Server response:', error.response.data);
                    }
                }
            }
        } catch (error) {
            console.error('Error deleting logo from Cloudinary:', error);
        }
    };
    
    // Removed debug log to prevent excessive console output
    // console.log('MapHeader props:', { title, color, logoUrl, username });
    
    const location = useLocation();
    const isHome = location.pathname === '/' || location.pathname === '';
    const isEditor = location.pathname === '/editor';
    
    // Styles for icons - bolder for active page, thinner for inactive
    const activeStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '4px'
    };
    
    const inactiveStyle = {
        backgroundColor: 'transparent'
    };
    
    return (_jsx(AppBar, { 
        sx: {
            backgroundColor: color || '#000000',
            boxShadow: 3,
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            zIndex: 1000,
            height: '64px',
            minHeight: '64px',
            maxHeight: '64px',
            width: '100%',
            position: 'fixed', // Changed from absolute to fixed to prevent layout issues with modals
            top: 0,
            left: 0,
            right: 0
        }, 
        children: 
            _jsx(Toolbar, { 
                sx: { 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    minHeight: '64px',
                    height: '64px',
                    padding: '0',
                    paddingRight: '16px',
                    width: '100%'
                }, 
                children: 
                    _jsxs(Box, { 
                        sx: { 
                            display: 'flex', 
                            alignItems: 'center',
                            width: '100%',
                            justifyContent: 'center',
                            position: 'relative'
                        }, 
                        children: [
                            
                            // Center - Title with attribution
                            _jsxs(Box, {
                                sx: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center', // Center the content
                                    gap: '8px',
                                    width: '100%'
                                },
                                children: [
                                    // Centered container for logo and title together
                                    _jsxs(Box, {
                                        sx: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            position: 'relative'
                                        },
                                        children: [
                                            // Logo container with clear button
                                            logoUrl && (
                                                _jsxs(Box, {
                                                    sx: {
                                                        position: 'relative',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    },
                                                    children: [
                                                        // Logo image
                                                        _jsx(Box, { 
                                                            component: "img", 
                                                            src: logoUrl, 
                                                            alt: "Logo", 
                                                            sx: {
                                                                height: 40,
                                                                maxWidth: 120,
                                                                objectFit: 'contain',
                                                                marginRight: '8px',
                                                                marginTop: '-4px',
                                                                marginBottom: '-4px'
                                                            },
                                                            onError: (e) => {
                                                                // Set a fallback text if the image fails to load
                                                                if (e.target) {
                                                                    // Hide the broken image
                                                                    e.target.style.display = 'none';
                                                                    
                                                                    // Create a fallback text element that replaces the image
                                                                    // instead of appending to the parent
                                                                    const fallback = document.createElement('span');
                                                                    fallback.textContent = 'Logo';
                                                                    fallback.style.color = 'white';
                                                                    fallback.style.fontStyle = 'italic';
                                                                    fallback.style.fontSize = '0.8rem';
                                                                    fallback.style.marginRight = '8px';
                                                                    
                                                                    // Replace the image with the fallback text
                                                                    // This ensures it stays in the same position
                                                                    const parent = e.target.parentNode;
                                                                    if (parent) {
                                                                        // Insert before the image
                                                                        parent.insertBefore(fallback, e.target);
                                                                        // Remove the image
                                                                        parent.removeChild(e.target);
                                                                    }
                                                                }
                                                            },
                                                            onLoad: () => {
                                                                // Image loaded successfully
                                                            }
                                                        }),
                                                        
                                                        // Clear logo button - only show in editor mode, not in embed or presentation mode
                                                        // Use a more specific check to ensure we're in editor mode
                                                        (location.pathname === '/editor' || location.pathname === '/editor/') && 
                                                        _jsx(Tooltip, {
                                                            title: "Clear Logo",
                                                            children: _jsx(IconButton, {
                                                                size: "small",
                                                                onClick: handleClearLogo,
                                                                sx: {
                                                                    position: 'absolute',
                                                                    top: -10,
                                                                    right: 0,
                                                                    color: 'white',
                                                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                                    padding: '2px',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(0, 0, 0, 0.5)'
                                                                    }
                                                                },
                                                                children: _jsx(X, { size: 14 })
                                                            })
                                                        })
                                                    ]
                                                })
                                            ),
                                            
                                            // Title
                                            _jsx(Typography, { 
                                                variant: "h6", 
                                                component: "div", 
                                                sx: {
                                                    fontFamily: 'Fraunces, serif',
                                                    fontWeight: 700,
                                                    color: '#ffffff',
                                                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                                                }, 
                                                children: title || 'Untitled Route' 
                                            })
                                        ]
                                    }),
                                    
                                    // Username attribution on the right (if available)
                                    _jsx(Box, {
                                        sx: {
                                            order: 3, // Explicit ordering to ensure username is third
                                            minWidth: username ? 'auto' : '0px'
                                        },
                                        children: username && (
                                            _jsxs(Typography, {
                                                variant: "body2",
                                                sx: {
                                                    color: '#ffffff',
                                                    opacity: 0.9,
                                                    fontStyle: 'italic',
                                                    marginLeft: '4px',
                                                    marginTop: '3px',
                                                    alignSelf: 'center'
                                                },
                                                children: ["by ", username]
                                            })
                                        )
                                    })
                                ]
                            }),
                            
                            // Right side - Navigation links (moved from left)
                            _jsxs(Box, { 
                                sx: { 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1px',
                                    position: 'absolute',
                                    right: '16px'
                                },
                                children: [
                                    _jsx(Tooltip, {
                                        title: "Home",
                                        children: _jsx(IconButton, {
                                            component: Link,
                                            to: "/",
                                            sx: {
                                                ...(isHome ? activeStyle : inactiveStyle),
                                                padding: '8px',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                                }
                                            },
                                            children: _jsx(Home, { 
                                                size: 24,
                                                strokeWidth: isHome ? 2 : 1,
                                                color: '#ffffff'
                                            })
                                        })
                                    }),
                                    _jsx(Tooltip, {
                                        title: "Map Editor",
                                        children: _jsx(IconButton, {
                                            component: Link,
                                            to: "/editor",
                                            sx: {
                                                ...(isEditor ? activeStyle : inactiveStyle),
                                                padding: '8px',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                                }
                                            },
                                            children: _jsx(Map, { 
                                                size: 24,
                                                strokeWidth: isEditor ? 2 : 1,
                                                color: '#ffffff'
                                            })
                                        })
                                    })
                                ]
                            })
                        ]
                    })
            })
    }));
};

// Custom equality function to prevent unnecessary re-renders
const arePropsEqual = (prevProps, nextProps) => {
    return prevProps.title === nextProps.title &&
           prevProps.color === nextProps.color &&
           prevProps.logoUrl === nextProps.logoUrl &&
           prevProps.username === nextProps.username;
};

// Wrap with React.memo with custom equality function
export default React.memo(MapHeader, arePropsEqual);
