import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Tooltip } from '@mui/material';
import { Home, Map, Shield } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { withNavigationDelay } from '../../../../utils/navigationUtils';

/**
 * LandingPageHeader component displays a header bar with the site title
 * Simplified version of MapHeader for use on the landing page
 */
const LandingPageHeader = ({ title = 'bikeroutes', color = '#000000' }) => {
    const location = useLocation();
    const isHome = location.pathname === '/' || location.pathname === '';
    const isEditor = location.pathname === '/editor';
    const isPrivacy = location.pathname === '/privacy-policy.html';
    
    // Styles for icons - bolder for active page, thinner for inactive
    const activeStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '4px'
    };
    
    const inactiveStyle = {
        backgroundColor: 'transparent'
    };
    
    return _jsx(AppBar, {
        sx: {
            backgroundColor: color || '#000000',
            boxShadow: 3,
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            zIndex: 1000,
            height: '64px',
            minHeight: '64px',
            maxHeight: '64px',
            width: '100%',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0
        },
        children: _jsx(Toolbar, {
            sx: { 
                display: 'flex', 
                justifyContent: 'space-between',
                minHeight: '64px',
                height: '64px',
                padding: '0',
                paddingRight: '16px',
                width: '100%'
            },
            children: _jsxs(Box, {
                sx: { 
                    display: 'flex', 
                    alignItems: 'center',
                    width: '100%',
                    justifyContent: 'center',
                    position: 'relative'
                },
                children: [
                    // Center - Title
                    _jsx(Box, {
                        sx: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            width: '100%'
                        },
                        children: _jsx(Box, {
                            sx: {
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                position: 'relative'
                            },
                            children: _jsx(Typography, {
                                variant: "h6",
                                component: "div",
                                sx: {
                                    fontFamily: 'Fraunces, serif',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '500px' // Increased to allow more text on desktop before truncation
                                },
                                children: title
                            })
                        })
                    }),
                    
                    // Right side - Navigation links
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
                                    // Use onClick with navigation delay instead of Link component
                                    onClick: withNavigationDelay(() => {
                                        window.location.href = '/';
                                    }, { delay: 150 }),
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
                                    // Use onClick with navigation delay instead of Link component
                                    onClick: withNavigationDelay(() => {
                                        window.location.href = '/editor';
                                    }, { delay: 150 }),
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
                            }),
                            _jsx(Tooltip, {
                                title: "Privacy Policy",
                                children: _jsx(IconButton, {
                                    // Use onClick with navigation delay instead of Link component
                                    onClick: withNavigationDelay(() => {
                                        window.location.href = '/privacy-policy.html';
                                    }, { delay: 150 }),
                                    sx: {
                                        ...(isPrivacy ? activeStyle : inactiveStyle),
                                        padding: '8px',
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                        }
                                    },
                                    children: _jsx(Shield, {
                                        size: 24,
                                        strokeWidth: isPrivacy ? 2 : 1,
                                        color: '#ffffff'
                                    })
                                })
                            })
                        ]
                    })
                ]
            })
        })
    });
};

export default LandingPageHeader;
