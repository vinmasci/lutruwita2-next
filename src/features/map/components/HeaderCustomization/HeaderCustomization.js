import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
// We'll handle Cloudinary upload in RouteContext instead

/**
 * HeaderCustomization component allows users to customize the header
 * by changing its color, adding a username, and/or adding a logo
 */
const HeaderCustomization = ({ color, logoUrl, username, onSave }) => {
  const { user, isAuthenticated } = useAuth0();
  const [headerColor, setHeaderColor] = useState(color || 'rgba(35, 35, 35, 0.9)');
  const [headerLogoUrl, setHeaderLogoUrl] = useState(logoUrl || '');
  const [headerUsername, setHeaderUsername] = useState(username || '');
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [logoBlob, setLogoBlob] = useState(null);
  const fileInputRef = useRef(null);
  const colorInputRef = useRef(null);
  
  // Apply the color from the input field
  const applyColorFromInput = () => {
    if (colorInputRef.current) {
      setHeaderColor(colorInputRef.current.value);
    }
  };
  
  // Apply the color when the input loses focus
  const handleColorInputBlur = () => {
    applyColorFromInput();
  };
  
  // Apply the color when Enter key is pressed
  const handleColorInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      applyColorFromInput();
    }
  };
  
  // Update the input field when headerColor changes
  useEffect(() => {
    if (colorInputRef.current) {
      colorInputRef.current.value = headerColor;
    }
  }, [headerColor]);
  
  // Fetch user data from MongoDB when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      // Only fetch if authenticated and username is not already set
      if (isAuthenticated && user?.sub && !username) {
        try {
          setIsLoadingUser(true);
          // Import the userService dynamically to avoid circular dependencies
          const { fetchUserData } = await import('../../../../features/auth/services/userService');
          
          // Fetch user data from MongoDB
          const userData = await fetchUserData(user.sub);
          
          // Set the username if it exists in the user data and no username was provided
          if (userData && userData.name && !headerUsername) {
            setHeaderUsername(userData.name);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // If there's an error, fall back to Auth0 user name
          if (user?.name && !headerUsername) {
            setHeaderUsername(user.name);
          }
        } finally {
          setIsLoadingUser(false);
        }
      }
    };
    
    fetchUserData();
  }, [isAuthenticated, user, username, headerUsername]);

  // Handle logo file selection (without immediate upload)
  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      // Store the file for later upload
      setSelectedLogoFile(file);
      
      // Create a blob from the file for storage
      const blob = await file.arrayBuffer().then(buffer => new Blob([buffer], { type: file.type }));
      setLogoBlob(blob);
      
      // Create a local preview URL from the blob
      const previewUrl = URL.createObjectURL(blob);
      setHeaderLogoUrl(previewUrl);
      
      console.log('Logo file prepared for temporary storage:', {
        name: file.name,
        type: file.type,
        size: file.size,
        previewUrl,
        hasBlob: !!blob
      });
    } catch (error) {
      console.error('Error preparing logo file:', error);
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      // Save the changes with console log for debugging
      console.log('Saving header settings:', {
        color: headerColor,
        logoUrl: headerLogoUrl,
        username: headerUsername,
        logoFile: selectedLogoFile ? selectedLogoFile.name : null,
        hasBlob: !!logoBlob
      });
      
      // Create a logo object similar to how photos are stored
      const logoData = selectedLogoFile ? {
        file: selectedLogoFile,
        url: headerLogoUrl,
        isLocal: true,
        name: selectedLogoFile.name,
        type: selectedLogoFile.type,
        size: selectedLogoFile.size,
        _blobs: {
          original: logoBlob || selectedLogoFile
        }
      } : null;
      
      // Pass both the URL for preview and the logo data for later upload
      onSave({
        color: headerColor,
        logoUrl: headerLogoUrl,
        username: headerUsername,
        logoFile: selectedLogoFile, // Pass the file object to parent component
        logoData, // Pass the logo data object for storage
        logoBlob // Pass the blob directly for more reliable storage
      });
      
      // Don't revoke the object URL here as we need it to persist
      // We'll handle cleanup when the route is saved to Cloudinary
      
      // Reset state
      setSelectedLogoFile(null);
      setIsExpanded(false);
    } catch (error) {
      console.error('Error saving header customization:', error);
    }
  };

  // Handle logo removal
  const handleRemoveLogo = () => {
    // Clean up any object URLs to prevent memory leaks
    if (headerLogoUrl) {
      URL.revokeObjectURL(headerLogoUrl);
    }
    
    setHeaderLogoUrl('');
    setSelectedLogoFile(null);
    setLogoBlob(null);
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  // Custom color picker component that matches the routes list style
  const ColorPicker = () => {
    // Predefined colors in the specified order
    const predefinedColors = [
      '#750E21', // Dark red
      '#4C0033', // Burnt orange
      '#27391C', // Dark Green
      '#0B2447', // Blue
      '#070A52', // Navy blue
      '#451952', // Purple
      '#1e272e', // Dark slate
    ];

    return (
      _jsxs(Box, {
        sx: {
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        },
        children: [
          // Color input field with preview
          _jsxs(Box, {
            sx: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            },
            children: [
              // Color preview
              _jsx("div", {
                style: {
                  width: '24px',
                  height: '24px',
                  backgroundColor: headerColor,
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.5)'
                }
              }),
              
              // Hex color input field - uncontrolled input with ref
              _jsx("input", {
                type: "text",
                ref: colorInputRef,
                defaultValue: headerColor,
                onBlur: handleColorInputBlur,
                onKeyDown: handleColorInputKeyDown,
                placeholder: "#RRGGBB or rgba(r,g,b,a)",
                style: {
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '8px',
                  flexGrow: 1,
                  fontFamily: 'monospace'
                }
              })
            ]
          }),
          
          // Predefined color palette
          _jsx(Box, {
            sx: {
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '4px'
            },
            children: predefinedColors.map((color, index) => (
              _jsx(Box, {
                key: index,
                sx: {
                  width: '30px',
                  height: '30px',
                  backgroundColor: color,
                  borderRadius: '4px',
                  border: headerColor === color ? '2px solid white' : '1px solid rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  '&:hover': {
                    border: '2px solid rgba(255, 255, 255, 0.8)'
                  }
                },
                onClick: () => {
                  setHeaderColor(color);
                  if (colorInputRef.current) {
                    colorInputRef.current.value = color;
                  }
                }
              })
            ))
          })
        ]
      })
    );
  };

  return (
    _jsxs(Box, { 
      sx: { 
        // Remove positioning from here as it's handled by the parent container
      }, 
      children: [
        // Customize Header button with map control styling
        _jsx(Button, {
          variant: "contained",
          sx: {
            color: 'white',
            textTransform: 'none',
            padding: '6px 10px',
            fontSize: '0.875rem',
            fontWeight: 500,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            boxShadow: '0px 0px 0px 2px rgba(0, 0, 0, 0.1)',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }
          },
          onClick: () => setIsExpanded(!isExpanded),
          children: isExpanded ? "Hide Options" : "Customize Header"
        }),
        
        // Expanded customization panel
        isExpanded && _jsx(Card, {
          sx: {
            width: 300,
            backgroundColor: 'rgba(35, 35, 35, 0.9)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: 3,
            mt: 1
          },
          children: _jsx(CardContent, {
            sx: { padding: 2 },
            children: _jsxs(Box, {
              sx: {
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              },
              children: [
                _jsxs(Box, {
                  sx: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  },
                  children: [
                    _jsx(Typography, {
                      variant: "body2",
                      sx: { fontWeight: 'bold' },
                      children: "Header Color"
                    }),
                    _jsx(ColorPicker, {})
                  ]
                }),
                
                _jsxs(Box, {
                  sx: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  },
                  children: [
                    _jsx(Typography, {
                      variant: "body2",
                      sx: { fontWeight: 'bold' },
                      children: "Attribution"
                    }),
                    
                    // Username input field with loading indicator
                    _jsxs(Box, {
                      sx: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1
                      },
                      children: [
                        _jsx(Typography, {
                          variant: "body2",
                          sx: { whiteSpace: 'nowrap' },
                          children: "by"
                        }),
                        _jsxs(Box, {
                          sx: {
                            position: 'relative',
                            flexGrow: 1
                          },
                          children: [
                            _jsx("input", {
                              type: "text",
                              value: headerUsername,
                              onChange: (e) => setHeaderUsername(e.target.value),
                              placeholder: isLoadingUser ? "Loading..." : "Your name",
                              style: {
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '4px',
                                padding: '8px',
                                width: '100%',
                                fontFamily: 'inherit',
                                outline: 'none' // Prevent default focus outline
                              },
                              // Custom focus styles that don't use blue
                              onFocus: (e) => {
                                e.target.style.border = '1px solid rgba(255, 255, 255, 0.8)';
                                e.target.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.3)';
                              },
                              onBlur: (e) => {
                                e.target.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                                e.target.style.boxShadow = 'none';
                              }
                            }),
                            isLoadingUser && _jsx(CircularProgress, {
                              size: 16,
                              sx: {
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'rgba(255, 255, 255, 0.7)'
                              }
                            })
                          ]
                        })
                      ]
                    }),
                    
                    isAuthenticated && _jsx(Typography, {
                      variant: "caption",
                      sx: { 
                        display: 'block',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontStyle: 'italic',
                        fontSize: '0.7rem',
                        mb: 1
                      },
                      children: "Auto-populated from your profile"
                    }),
                    
                    _jsx(Typography, {
                      variant: "body2",
                      sx: { textAlign: 'center', mb: 1 },
                      children: "and/or"
                    }),
                    
                    _jsx(Typography, {
                      variant: "caption",
                      sx: { 
                        textAlign: 'center', 
                        mb: 1, 
                        display: 'block',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontStyle: 'italic'
                      },
                      children: "Recommended logo height: 40-60px"
                    }),
                    
                    _jsxs(Box, {
                      sx: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      },
                      children: [
                        // Hidden file input
                        _jsx("input", {
                          type: "file",
                          accept: "image/*",
                          style: { display: 'none' },
                          ref: fileInputRef,
                          onChange: handleLogoUpload
                        }),
                        
                        // Upload button
                        _jsx(Button, {
                          variant: "outlined",
                          startIcon: _jsx(CloudUploadIcon, {}),
                          onClick: handleUploadClick,
                          sx: {
                            flexGrow: 1,
                            color: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            '&:hover': {
                              borderColor: 'white'
                            }
                          },
                          children: selectedLogoFile ? "Change Logo" : "Select Logo"
                        }),
                        
                        // Remove logo button
                        _jsx(Tooltip, {
                          title: "Remove Logo",
                          children: _jsx(IconButton, {
                            size: "small",
                            onClick: handleRemoveLogo,
                            disabled: !headerLogoUrl,
                            sx: {
                              color: 'white',
                              opacity: headerLogoUrl ? 1 : 0.5
                            },
                            children: _jsx(DeleteIcon, {})
                          })
                        })
                      ]
                    }),
                    
                    headerLogoUrl && _jsx(Box, {
                      sx: {
                        mt: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        padding: 1,
                        borderRadius: 1
                      },
                      children: _jsx(Box, {
                        component: "img",
                        src: headerLogoUrl,
                        alt: "Logo Preview",
                        sx: {
                          maxHeight: 80, // Increased from 60
                          maxWidth: '100%',
                          objectFit: 'contain'
                        }
                      })
                    })
                  ]
                }),
                
                _jsx(Button, {
                  variant: "outlined",
                  onClick: handleSave,
                  disabled: isUploading,
                  sx: {
                    mt: 1,
                    flexGrow: 1,
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      borderColor: 'white'
                    }
                  },
                  children: isUploading ? 
                    _jsxs(Box, {
                      sx: { display: 'flex', alignItems: 'center', gap: 1 },
                      children: [
                        _jsx(CircularProgress, { size: 20, color: "inherit" }),
                        "Uploading..."
                      ]
                    }) : 
                    "Apply Changes"
                })
              ]
            })
          })
        })
      ]
    })
  );
};

export default HeaderCustomization;
