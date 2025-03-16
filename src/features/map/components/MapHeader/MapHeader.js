import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AppBar, Toolbar, Typography, Box, IconButton, Tooltip } from '@mui/material';
import { Home, Map } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

/**
 * MapHeader component displays a header bar with the route title and attribution
 * Attribution can be either a username or a logo
 */
const MapHeader = ({ title, color = '#000000', logoUrl, username }) => {
    // Debug log to see what props are being passed
    console.log('MapHeader props:', { title, color, logoUrl, username });
    
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
        position: "relative", // Changed from static to relative
        sx: {
            backgroundColor: color || '#000000',
            boxShadow: 3,
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            zIndex: 1000,
            height: '64px',
            minHeight: '64px',
            maxHeight: '64px',
            width: '100%',
            position: 'absolute', // Ensure it's positioned absolutely
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
                                    justifyContent: 'center',
                                    gap: '8px'
                                },
                                children: [
                                    // Logo on the left (if available)
                                    logoUrl && (
                                        _jsx(Box, { 
                                            component: "img", 
                                            src: logoUrl, 
                                            alt: "Logo", 
                                            sx: {
                                                height: 40, // Increased from 30
                                                maxWidth: 120, // Increased from 100
                                                objectFit: 'contain',
                                                marginRight: '8px',
                                                marginTop: '-4px', // Shift up slightly to fit in header
                                                marginBottom: '-4px' // Shift up slightly to fit in header
                                            },
                                            onError: (e) => {
                                                console.error('Error loading logo image:', e);
                                                console.log('Failed logo URL:', logoUrl);
                                                
                                                // Set a fallback text if the image fails to load
                                                if (e.target) {
                                                    // Hide the broken image
                                                    e.target.style.display = 'none';
                                                    
                                                    // Create a fallback text element
                                                    const parent = e.target.parentNode;
                                                    if (parent) {
                                                        const fallback = document.createElement('span');
                                                        fallback.textContent = 'Logo';
                                                        fallback.style.color = 'white';
                                                        fallback.style.fontStyle = 'italic';
                                                        fallback.style.fontSize = '0.8rem';
                                                        parent.appendChild(fallback);
                                                    }
                                                }
                                            },
                                            onLoad: () => {
                                                console.log('Logo loaded successfully:', logoUrl);
                                            }
                                        })
                                    ),
                                    
                                    // Title in the center
                                    _jsx(Typography, { 
                                        variant: "h6", 
                                        component: "div", 
                                        sx: {
                                            fontFamily: 'Fraunces, serif',
                                            fontWeight: 700,
                                            color: '#ffffff',
                                            textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                                            textAlign: 'center'
                                        }, 
                                        children: title || 'Untitled Route' 
                                    }),
                                    
                                    // Username attribution on the right (if available)
                                    username && (
                                        _jsxs(Typography, {
                                            variant: "body2",
                                            sx: {
                                                color: '#ffffff',
                                                opacity: 0.9,
                                                fontStyle: 'italic',
                                                marginLeft: '4px',
                                                marginTop: '3px', // Just a tiny bit down
                                                alignSelf: 'center' // Center align instead of bottom align
                                            },
                                            children: ["by ", username]
                                        })
                                    )
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

export default MapHeader;
