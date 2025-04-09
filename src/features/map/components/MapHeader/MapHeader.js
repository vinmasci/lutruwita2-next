import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Tooltip } from '@mui/material';
import { Home, Map, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { withNavigationDelay } from '../../../../utils/navigationUtils';
import { useRouteContext } from '../../context/RouteContext';
import CountdownTimer from './CountdownTimer';

/**
 * MapHeader component displays a header bar with the route title and attribution
 * Attribution can be either a username or a logo
 */
const MapHeader = ({ title, color = '#000000', logoUrl, username, type, eventDate }) => {
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
             height: '72px',      // Increased height
             minHeight: '72px',   // Increased height
             maxHeight: '72px',   // Increased height
             width: '100%',
             position: 'sticky', // Changed from fixed to sticky for better mobile behavior
            top: 0,
            left: 0,
            right: 0
        }, 
        children: 
            _jsx(Toolbar, { 
                 sx: {
                     display: 'flex',
                     justifyContent: 'space-between',
                     minHeight: '72px',   // Increased height
                     height: '72px',      // Increased height
                     padding: '0 16px', // Add horizontal padding
                     width: '100%'
                },
                children: [
                    // Left side - Empty box for spacing
                    _jsx(Box, { 
                        sx: { display: 'flex', alignItems: 'center' }
                    }),

                    // Center Box - Title/Attribution
                    _jsxs(Box, {
                        sx: {
                            display: 'flex',
                            alignItems: 'center', // Vertically center items in the toolbar
                            justifyContent: 'center', // Horizontally center the inner content
                            position: 'absolute', // Position absolutely to allow true centering
                            left: '50%',
                            transform: 'translateX(-50%)', // Centering trick
                            // Ensure it doesn't overlap icons on small screens by limiting width if necessary
                            // maxWidth: 'calc(100% - 160px)', // Example: Adjust based on icon widths + padding
                            pointerEvents: 'none', // Prevent center box from capturing clicks meant for map below
                        },
                        children: [
                            // Inner content box (Title, Username) - Allow pointer events here
                            _jsxs(Box, {
                                sx: {
                                     pointerEvents: 'auto', // Re-enable pointer events for content
                                      display: 'flex',
                                      flexDirection: 'column', // Stack Title and Username vertically
                                       // alignItems: 'center', // Keep removed
                                       // justifyContent: 'center', // Keep removed
                                       gap: '0px', // Reduced gap to 0px
                                   },
                                 children: [
                                      // Container for logo and title (two-column layout)
                                      _jsxs(Box, {
                                          sx: {
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '12px',
                                              position: 'relative',
                                        },
                                        children: [
                                            // Logo container
                                            logoUrl && (
                                                _jsxs(Box, {
                                                    sx: {
                                                        position: 'relative',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        height: '100%'
                                                    },
                                                    children: [
                                                        // Logo image
                                                        _jsx(Box, {
                                                            component: "img",
                                                            src: logoUrl,
                                                             alt: "Logo",
                                                              sx: {
                                                                  height: '64px', // Full height with small padding
                                                                  maxWidth: '100px', // Adjusted max width
                                                                  objectFit: 'contain',
                                                                  padding: '4px 0', // Small padding at top and bottom
                                                              },
                                                             onError: (e) => { /* Fallback logic */ },
                                                            onLoad: () => { /* Success */ }
                                                        }),

                                                        // Clear logo button
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
                                                                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
                                                                },
                                                                children: _jsx(X, { size: 14 })
                                                            })
                                                        })
                                                    ]
                                                })
                                            ),

                                            // Title and attribution column
                                            _jsxs(Box, {
                                                sx: {
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'center',
                                                },
                                                children: [
                                                    // Title
                                                    _jsx(Typography, {
                                                        variant: "h6",
                                                        component: "div",
                                                        sx: {
                                                            fontFamily: 'Fraunces, serif',
                                                            fontWeight: 700,
                                                            color: '#ffffff',
                                                            textShadow: '2px 2px 3px rgba(0,0,0,0.8)', // Stronger, bigger shadow
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden', // Keep this, but add padding
                                                            textOverflow: 'ellipsis',
                                                            maxWidth: '500px', // Increased to allow more text on desktop before truncation
                                                            padding: '5px 5px 2px 5px' // Add padding to allow shadow room
                                                        },
                                                        children: title || 'Untitled Route'
                                                    }),
                                                    
                                                    // Small line break
                                                    _jsx(Box, { sx: { height: '2px' } }),
                                                    
                                                    // Username attribution (if available)
                                                    username && (
                                                        _jsxs(Typography, {
                                                            variant: "body2",
                                                            sx: {
                                                                color: '#ffffff',
                                                                opacity: 0.9,
                                                                fontStyle: 'italic',
                                                                paddingLeft: '5px'
                                                            },
                                                            children: ["by ", username]
                                                        })
                                                    )
                                                ]
                                            })
                                        ]
                                    }),
                                    
                                    // We don't need the countdown timer in the header since we have the floating one
                                    // type === 'event' && eventDate && (
                                    //     _jsx(CountdownTimer, { eventDate })
                                    // ),
                                ]
                            })
                        ]
                    }),

                    // Right side - Navigation links
                    _jsxs(Box, {
                        sx: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1px',
                            // This Box remains on the right due to Toolbar's space-between
                        },
                        children: [
                            // Home Icon with navigation delay
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
                                        // Removed filter from IconButton
                                    },
                                    children: _jsx(Home, {
                                        size: 24,
                                        strokeWidth: 2, // Make consistently thicker
                                        color: '#ffffff',
                                        style: { filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.7))' } // Add shadow to icon
                                    })
                                })
                            }),
                            // Map Editor Icon with navigation delay
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
                                        // Removed filter from IconButton
                                    },
                                    children: _jsx(Map, {
                                        size: 24,
                                        strokeWidth: 2, // Make consistently thicker
                                        color: '#ffffff',
                                        style: { filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.7))' } // Add shadow to icon
                                    })
                                })
                            })
                        ]
                    })
                ] // End of Toolbar children array
            }) // End of Toolbar
    }));
};

// Custom equality function to prevent unnecessary re-renders
const arePropsEqual = (prevProps, nextProps) => {
    return prevProps.title === nextProps.title &&
           prevProps.color === nextProps.color &&
           prevProps.logoUrl === nextProps.logoUrl &&
           prevProps.username === nextProps.username &&
           prevProps.type === nextProps.type &&
           prevProps.eventDate === nextProps.eventDate;
};

// Wrap with React.memo with custom equality function
export default React.memo(MapHeader, arePropsEqual);
