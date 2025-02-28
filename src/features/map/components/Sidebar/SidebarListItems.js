import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, Tooltip, Divider, Snackbar, Alert } from '@mui/material';
import { useRouteContext } from '../../context/RouteContext';
import { SidebarIcons } from './icons';
import { SaveDialog } from './SaveDialog.jsx';
import { LoadDialog } from './LoadDialog';

export const SidebarListItems = ({ onUploadGpx, onAddPhotos, onAddPOI, onItemClick }) => {
    const { routes, savedRoutes, saveCurrentState, listRoutes, loadRoute, deleteSavedRoute, currentLoadedState, currentLoadedPersistentId, hasUnsavedChanges, isSaving } = useRouteContext();
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [loadDialogOpen, setLoadDialogOpen] = useState(false);
    const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [activeItem, setActiveItem] = useState(null);

    const handleSaveClick = () => {
        console.log('Save clicked, current routes:', routes);
        if (routes.length === 0) {
            console.warn('No routes to save');
            return;
        }
        setSaveDialogOpen(true);
    };

    const handleLoadClick = () => {
        console.log('Load clicked');
        // Open the modal immediately with loading state
        setIsLoadingRoutes(true);
        setLoadDialogOpen(true);
        // Show the snackbar notification
        setSnackbarOpen(true);
        setSnackbarMessage('Loading routes, this may take a moment...');
        setSnackbarSeverity('info');
        
        // Fetch routes in the background
        listRoutes()
            .then(() => {
                // Update the loading state when routes are fetched
                setIsLoadingRoutes(false);
                // Close the snackbar
                setSnackbarOpen(false);
            })
            .catch(error => {
                console.error('Failed to list routes:', error);
                setIsLoadingRoutes(false);
                // Close the snackbar
                setSnackbarOpen(false);
            });
    };

    // Show saving notification when isSaving changes
    useEffect(() => {
        if (isSaving) {
            setSnackbarMessage('Your route is saving, this may take a moment...');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
        } else if (snackbarMessage === 'Your route is saving, this may take a moment...') {
            setSnackbarOpen(false);
        }
    }, [isSaving, snackbarMessage]);

    const handleItemClick = (id, onClick) => {
        setActiveItem(id === activeItem ? null : id);
        onClick();
    };

    const topItems = [
        {
            id: 'gpx',
            icon: SidebarIcons.actions.gpx,
            text: 'Add GPX',
            onClick: () => {
                onItemClick('gpx');
                onUploadGpx();
            }
        },
        {
            id: 'photos',
            icon: SidebarIcons.actions.photos,
            text: 'Add GPS Photo',
            onClick: onAddPhotos
        },
        {
            id: 'poi',
            icon: SidebarIcons.actions.poi,
            text: 'Add POI',
            onClick: onAddPOI
        }
    ];

    const bottomItems = [
        {
            id: 'load',
            icon: SidebarIcons.actions.load,
            text: 'Load GPX',
            onClick: handleLoadClick
        },
        {
            id: 'save',
            icon: SidebarIcons.actions.save,
            text: 'Save GPX',
            onClick: handleSaveClick,
            disabled: routes.length === 0
        }
    ];

    return (_jsxs(_Fragment, { 
        children: [
            // Snackbar notification for loading/saving routes
            _jsx(Snackbar, {
                open: snackbarOpen,
                anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
                children: _jsx(Alert, {
                    severity: snackbarSeverity,
                    sx: { width: '100%', backgroundColor: 'rgb(35, 35, 35)', color: 'white' },
                    children: snackbarMessage
                })
            }),
            _jsx(List, { 
                sx: { display: 'flex', flexDirection: 'column', height: '100%' },
                children: [
                    ...topItems.map((item) => (
                        _jsx(Tooltip, { 
                            title: item.text, 
                            placement: "right", 
                            children: _jsx(ListItem, { 
                                disablePadding: true, 
                                children: _jsx(ListItemButton, { 
                                    onClick: () => handleItemClick(item.id, item.onClick),
                                    disabled: item.disabled,
                                    'data-active': activeItem === item.id,
                                    sx: {
                                        opacity: item.disabled ? 0.5 : 1,
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                        },
                                        '&:hover .MuiListItemIcon-root svg, &[data-active="true"] .MuiListItemIcon-root svg': {
                                            color: '#ff4d4f'
                                        }
                                    }, 
                                    children: _jsx(ListItemIcon, { 
                                        children: _jsx(item.icon, { strokeWidth: 1.5 }) 
                                    }) 
                                }) 
                            }) 
                        }, item.text)
                    )),
                    _jsx(Divider, { sx: { my: 1, borderColor: '#333' } }),
                    ...bottomItems.map((item) => (
                        _jsx(Tooltip, { 
                            title: item.text, 
                            placement: "right", 
                            children: _jsx(ListItem, { 
                                disablePadding: true, 
                                children: _jsx(ListItemButton, { 
                                    onClick: () => handleItemClick(item.id, item.onClick),
                                    disabled: item.disabled,
                                    'data-active': activeItem === item.id,
                                    sx: {
                                        opacity: item.disabled ? 0.5 : 1,
                                        '&:hover': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                        },
                                        '&:hover .MuiListItemIcon-root svg, &[data-active="true"] .MuiListItemIcon-root svg': {
                                            color: '#ff4d4f'
                                        }
                                    }, 
                                    children: _jsx(ListItemIcon, { 
                                        children: _jsx(item.icon, { strokeWidth: 1.5 }) 
                                    }) 
                                }) 
                            }) 
                        }, item.text)
                    ))
                ]
            }), 
            _jsx(SaveDialog, { 
                open: saveDialogOpen, 
                onClose: () => setSaveDialogOpen(false), 
                onSave: (formData) => {
                    // Don't close the dialog immediately, let it stay open while saving
                    // The isSaving prop will show the spinner
                    saveCurrentState(formData.name, formData.type, formData.isPublic)
                        .then(() => {
                            setSaveDialogOpen(false);
                        })
                        .catch(error => {
                            console.error('Failed to save:', error);
                        });
                }, 
                initialValues: currentLoadedState ? {
                    name: currentLoadedState.name,
                    type: currentLoadedState.type || 'tourism',
                    isPublic: currentLoadedState.isPublic || false
                } : undefined, 
                isEditing: !!currentLoadedPersistentId,
                isSaving: isSaving
            }), 
            _jsx(LoadDialog, { 
                open: loadDialogOpen, 
                onClose: () => setLoadDialogOpen(false), 
                routes: savedRoutes,
                isLoading: isLoadingRoutes,
                onLoad: async (id) => {
                    try {
                        await loadRoute(id);
                        setLoadDialogOpen(false);
                    }
                    catch (error) {
                        console.error('Failed to load:', error);
                    }
                }, 
                onDelete: deleteSavedRoute, 
                hasUnsavedChanges: hasUnsavedChanges 
            })
        ] 
    }));
};
