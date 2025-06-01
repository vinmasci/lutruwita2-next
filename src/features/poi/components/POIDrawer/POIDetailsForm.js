import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { 
  TextField, Box, Typography, CircularProgress, Rating, Link, Divider, 
  List, ListItem, ListItemText, ListItemIcon, Tooltip, IconButton,
  Button 
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import LanguageIcon from '@mui/icons-material/Language';
import StarIcon from '@mui/icons-material/Star';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';

const POIDetailsForm = ({
  selectedPoi,
  searchName,
  setSearchName,
  googlePlacesLink,
  setGooglePlacesLink,
  googlePlacesData,
  isProcessingLink,
  linkError,
  searchResults,
  isSearching,
  handleSelectPlace,
  onCancel,
  onSave
}) => {
  // Get the icon definition for default name
  const iconDef = getIconDefinition(selectedPoi.icon);
  
  // Add fallback color
  const categoryColor = POI_CATEGORIES[selectedPoi.category]?.color || '#777777';
  
  return _jsxs(Box, {
    sx: { display: 'flex', flexDirection: 'column', gap: 2, p: 2, height: 'calc(100% - 64px)', overflowY: 'auto' },
    children: [
      // POI Type Display
      _jsxs(Box, {
        sx: {
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: 'rgb(45, 45, 45)',
          padding: '12px',
          borderRadius: '4px'
        },
        children: [
          _jsx("i", {
            className: iconDef?.name,
            style: {
              color: categoryColor,
              fontSize: '24px'
            }
          }),
          _jsx(Typography, {
            variant: "body2",
            color: "text.secondary",
            children: POI_CATEGORIES[selectedPoi.category]?.label || 'Unknown Category'
          })
        ]
      }),
      
      // Name Field with Search
      _jsxs(Box, {
        sx: { position: 'relative' },
        children: [
          _jsx(TextField, {
            label: "Name",
            value: searchName,
            onChange: (e) => setSearchName(e.target.value),
            fullWidth: true,
            variant: "outlined",
            size: "small",
            sx: {
              backgroundColor: 'rgb(35, 35, 35)',
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgb(255, 255, 255)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgb(255, 255, 255)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgb(255, 255, 255)',
                }
              },
              '& .MuiInputLabel-root': {
                color: 'rgb(255, 255, 255)'
              },
              '& .MuiOutlinedInput-input': {
                color: 'rgb(255, 255, 255)'
              }
            }
          }),
          
          isSearching && _jsx(CircularProgress, {
            size: 20,
            sx: {
              position: 'absolute',
              right: 12,
              top: 12,
              color: 'white'
            }
          }),
          
          // Search results dropdown
          searchResults.length > 0 && _jsx(List, {
            sx: {
              position: 'absolute',
              width: '100%',
              maxHeight: '200px',
              overflowY: 'auto',
              backgroundColor: 'rgb(45, 45, 45)',
              color: 'white',
              zIndex: 1000,
              borderRadius: '4px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
              mt: 0.5
            },
            children: searchResults.map((place) => _jsxs(ListItem, {
              button: true,
              onClick: () => handleSelectPlace(place),
              sx: {
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              },
              children: [
                place.icon && _jsx(ListItemIcon, {
                  sx: { minWidth: '36px' },
                  children: _jsx("img", {
                    src: place.icon,
                    alt: "",
                    style: { width: '20px', height: '20px' }
                  })
                }),
                _jsx(ListItemText, {
                  primary: place.name,
                  secondary: place.address || place.vicinity,
                  primaryTypographyProps: {
                    color: 'white',
                    fontSize: '0.9rem'
                  },
                  secondaryTypographyProps: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.8rem'
                  }
                }),
                place.rating && _jsxs(Box, {
                  sx: { display: 'flex', alignItems: 'center', ml: 1 },
                  children: [
                    _jsx(Rating, {
                      value: place.rating,
                      readOnly: true,
                      size: "small",
                      precision: 0.1
                    }),
                    _jsx(Typography, {
                      variant: "caption",
                      sx: { ml: 0.5, color: 'rgba(255, 255, 255, 0.7)' },
                      children: place.rating.toFixed(1)
                    })
                  ]
                })
              ]
            }, place.placeId))
          })
        ]
      }),
      
      // Google Places Link Field
      _jsxs(Box, {
        sx: { display: 'flex', alignItems: 'center', gap: 1 },
        children: [
          _jsx(TextField, {
            label: "Google Places Link (optional)",
            value: googlePlacesLink,
            onChange: (e) => setGooglePlacesLink(e.target.value),
            fullWidth: true,
            variant: "outlined",
            size: "small",
            placeholder: "Paste Google Maps link or embed code...",
            error: !!linkError,
            helperText: linkError,
            sx: {
              backgroundColor: 'rgb(35, 35, 35)',
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgb(255, 255, 255)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgb(255, 255, 255)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgb(255, 255, 255)',
                }
              },
              '& .MuiInputLabel-root': {
                color: 'rgb(255, 255, 255)'
              },
              '& .MuiOutlinedInput-input': {
                color: 'rgb(255, 255, 255)'
              },
              '& .MuiFormHelperText-root': {
                color: 'rgb(255, 99, 99)'
              }
            }
          }),
          isProcessingLink
            ? _jsx(CircularProgress, { size: 24, sx: { color: 'white' } })
            : _jsx(Tooltip, {
                title: "Add a Google Maps link to fetch additional information. For best results, use an embed link from the 'Share' menu in Google Maps.",
                arrow: true,
                placement: "top",
                children: _jsx(IconButton, {
                  size: "small",
                  sx: { color: 'white' },
                  children: _jsx(HelpOutlineIcon, { fontSize: "small" })
                })
              })
        ]
      }),
      
      // Google Places Preview
      googlePlacesData && _jsxs(Box, {
        sx: {
          mt: 1,
          p: 2,
          backgroundColor: 'rgb(45, 45, 45)',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        },
        children: [
          _jsxs(Box, {
            sx: { 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              mb: 1
            },
            children: [
              _jsx(StarIcon, { sx: { color: '#FFD700', fontSize: '20px' } }),
              _jsx(Typography, {
                variant: "subtitle2",
                color: "white",
                fontWeight: "bold",
                children: "Google Places Preview"
              })
            ]
          }),
          
          _jsx(Divider, { sx: { borderColor: 'rgba(255, 255, 255, 0.1)', my: 1 } }),
          
          // Place ID
          googlePlacesData.placeId && _jsx(Box, {
            sx: { 
              display: 'flex', 
              mb: 1,
              alignItems: 'center'
            },
            "data-google-place-id": googlePlacesData.placeId,
            children: _jsx(Typography, {
              variant: "body2",
              color: "white",
              fontSize: "0.8rem",
              children: `Place ID: ${googlePlacesData.placeId}`
            })
          }),
          
          // Rating
          googlePlacesData.rating && _jsxs(Box, {
            sx: { 
              display: 'flex', 
              alignItems: 'center', 
              mb: 1
            },
            children: [
              _jsx(Rating, {
                value: googlePlacesData.rating,
                precision: 0.1,
                readOnly: true,
                size: "small"
              }),
              _jsx(Typography, {
                variant: "body2",
                color: "white",
                ml: 1,
                fontSize: "0.8rem",
                children: `${googlePlacesData.rating} / 5`
              })
            ]
          }),
          
          // Address
          googlePlacesData.address && _jsxs(Box, {
            sx: { 
              display: 'flex', 
              mb: 1,
              alignItems: 'flex-start'
            },
            children: [
              _jsx(LocationOnIcon, {
                sx: { 
                  color: 'white', 
                  mr: 1,
                  fontSize: '16px',
                  mt: '2px'
                }
              }),
              _jsx(Typography, {
                variant: "body2",
                color: "white",
                fontSize: "0.8rem",
                children: googlePlacesData.address
              })
            ]
          }),
          
          // Phone number
          googlePlacesData.phoneNumber && _jsxs(Box, {
            sx: { 
              display: 'flex', 
              mb: 1,
              alignItems: 'center'
            },
            children: [
              _jsx(PhoneIcon, {
                sx: { 
                  color: 'white', 
                  mr: 1,
                  fontSize: '16px'
                }
              }),
              _jsx(Typography, {
                variant: "body2",
                color: "white",
                fontSize: "0.8rem",
                children: googlePlacesData.phoneNumber
              })
            ]
          }),
          
          // Website
          googlePlacesData.website && _jsxs(Box, {
            sx: { 
              display: 'flex', 
              mb: 1,
              alignItems: 'center'
            },
            children: [
              _jsx(LanguageIcon, {
                sx: { 
                  color: 'white', 
                  mr: 1,
                  fontSize: '16px'
                }
              }),
              _jsx(Link, {
                href: googlePlacesData.website,
                target: "_blank",
                rel: "noopener noreferrer",
                sx: {
                  color: '#90caf9',
                  textDecoration: 'none',
                  fontSize: "0.8rem",
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                },
                children: googlePlacesData.website
              })
            ]
          })
        ]
      }),
      
      // Action Buttons
      _jsxs(Box, {
        sx: { mt: 'auto', display: 'flex', justifyContent: 'space-between' },
        children: [
          _jsx(Box, {
            component: "button",
            onClick: onCancel,
            sx: {
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid white',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            },
            children: "Cancel"
          }),
          _jsx(Box, {
            component: "button",
            onClick: onSave,
            sx: {
              backgroundColor: categoryColor,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.9
              }
            },
            children: "Save"
          })
        ]
      })
    ]
  });
};

export default POIDetailsForm;
