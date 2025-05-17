import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Typography, Button, DialogActions, Box, CircularProgress, Grid, CardMedia } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useState } from 'react';

const ConfirmDialog = ({ open, onClose, onConfirm }) => (
  _jsxs(Dialog, { 
    open: open, 
    onClose: onClose, 
    PaperProps: {
      sx: {
        backgroundColor: 'rgb(35, 35, 35)',
        color: 'white'
      }
    }, 
    children: [
      _jsx(DialogTitle, { children: "Unsaved Changes" }), 
      _jsx(DialogContent, { children: _jsx(Typography, { children: "You have unsaved changes that will be lost. Do you want to continue?" }) }), 
      _jsxs(DialogActions, { 
        children: [
          _jsx(Button, { onClick: onClose, sx: { color: 'rgba(255, 255, 255, 0.7)' }, children: "Cancel" }), 
          _jsx(Button, { onClick: onConfirm, sx: { color: '#f44336' }, children: "Discard Changes" })
        ] 
      })
    ] 
  })
);

export const LoadDialog = ({ open, onClose, routes, onLoad, onDelete, hasUnsavedChanges = false, isLoading = false }) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingLoadId, setPendingLoadId] = useState(null);
  
  const handleLoadClick = (id) => {
    // Make sure we're using a string ID
    const routeId = id ? String(id) : null;
    console.log('[LoadDialog] Loading route with ID:', routeId);
    
    if (!routeId) {
      console.error('[LoadDialog] Invalid route ID');
      return;
    }
    
    if (hasUnsavedChanges) {
      setPendingLoadId(routeId);
      setConfirmDialogOpen(true);
    } else {
      onLoad(routeId);
    }
  };
  
  const handleConfirmLoad = () => {
    if (pendingLoadId) {
      onLoad(pendingLoadId);
      setConfirmDialogOpen(false);
      setPendingLoadId(null);
    }
  };
  
  return (
    _jsxs(Dialog, { 
      open: open, 
      onClose: onClose, 
      PaperProps: {
        sx: {
          backgroundColor: 'rgb(35, 35, 35)',
          color: 'white',
          minWidth: '600px',
          maxWidth: '800px',
          borderRadius: '8px'
        }
      }, 
      children: [
        _jsx(DialogTitle, { 
          sx: {
            pb: 1,
            fontSize: '1.5rem',
            fontWeight: 500
          }, 
          children: "Load Route" 
        }), 
        _jsx(DialogContent, { 
          sx: { pt: '8px !important' }, 
          children: isLoading ? (
            // Show loading spinner when routes are being fetched
            _jsx(Box, { 
              sx: { display: 'flex', justifyContent: 'center', py: 4 }, 
              children: _jsx(CircularProgress, { sx: { color: 'rgba(255, 255, 255, 0.7)' } })
            })
          ) : !routes || routes.length === 0 ? (
            _jsx(Typography, { sx: { color: 'rgba(255, 255, 255, 0.7)' }, children: "No saved routes found" })
          ) : (
            _jsx(List, { 
              sx: { width: '100%', p: 0 },
              children: routes.map((route) => (
                _jsx(ListItem, {
                  component: "div",
                  disableGutters: true,
                  sx: {
                    width: '100%',
                    p: 0,
                    mb: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    '&:active': {
                      backgroundColor: 'rgba(255, 255, 255, 0.15)'
                    }
                  },
                  onClick: () => handleLoadClick(route.id || route.persistentId),
                  key: route.id || route.persistentId,
                  children: _jsxs(Box, {
                    sx: {
                      display: 'flex',
                      width: '100%',
                      position: 'relative'
                    },
                    children: [
                      // Left side - Square map image
                      _jsx(Box, {
                        sx: {
                          width: '120px',
                          height: '120px',
                          flexShrink: 0
                        },
                        children: _jsx(CardMedia, {
                          component: "img",
                          image: route.thumbnailUrl || '/placeholder-map.jpg',
                          alt: route.name,
                          sx: { 
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }
                        })
                      }),
                      
                      // Right side - Route details
                      _jsxs(Box, {
                        sx: {
                          p: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          flexGrow: 1
                        },
                        children: [
                          _jsx(Typography, {
                            variant: "h6",
                            sx: {
                              color: 'white',
                              fontSize: '1.1rem',
                              fontWeight: 500,
                              mb: 0.5
                            },
                            children: route.name
                          }),
                          
                          // Location and stats
                          _jsxs(Typography, {
                            variant: "body2",
                            sx: {
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem',
                              mb: 0.5
                            },
                            children: [
                              route.location || "Tasmania",
                              route.statistics && route.statistics.totalDistance && 
                                ` • ${route.statistics.totalDistance} km`
                            ]
                          }),
                          
                          // Additional stats
                          _jsxs(Typography, {
                            variant: "body2",
                            sx: {
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.875rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            },
                            children: [
                              route.statistics && route.statistics.totalAscent && 
                                `${route.statistics.totalAscent}m elevation`,
                              route.type && _jsxs("span", { children: [" • Type: ", route.type] }),
                              route.isPublic && (
                                _jsxs(_Fragment, { 
                                  children: [
                                    _jsx("span", { style: { color: 'rgba(255, 255, 255, 0.5)' }, children: " • " }),
                                    _jsx("span", { children: "Public" })
                                  ] 
                                })
                              )
                            ]
                          })
                        ]
                      }),
                      
                      // Delete button
                      onDelete && (
                        _jsx(Box, {
                          sx: {
                            position: 'absolute',
                            top: 8,
                            right: 8
                          },
                          children: _jsx(IconButton, { 
                            size: "small",
                              onClick: (e) => {
                                e.stopPropagation();
                                // Make sure we're using the correct ID property
                                const routeId = route.id || route.persistentId;
                                console.log('[LoadDialog] Deleting route with ID:', routeId);
                                onDelete(routeId);
                              }, 
                            sx: {
                              color: 'rgba(255, 255, 255, 0.7)',
                              backgroundColor: 'rgba(0, 0, 0, 0.3)',
                              '&:hover': {
                                color: '#f44336',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)'
                              },
                              transition: 'all 0.2s'
                            }, 
                            children: _jsx(Delete, { fontSize: "small" }) 
                          })
                        })
                      )
                    ]
                  })
                })
              ))
            })
          )
        }),
        _jsx(ConfirmDialog, { 
          open: confirmDialogOpen, 
          onClose: () => {
            setConfirmDialogOpen(false);
            setPendingLoadId(null);
          }, 
          onConfirm: handleConfirmLoad 
        })
      ] 
    })
  );
};
