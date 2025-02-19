import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, Tooltip } from '@mui/material';
import { useRouteContext } from '../../context/RouteContext';
import { SidebarIcons } from './icons';
import { SaveDialog } from './SaveDialog';
import { LoadDialog } from './LoadDialog';
export const SidebarListItems = ({ onUploadGpx, onAddPhotos, onAddPOI, onItemClick }) => {
    const { routes, savedRoutes, saveCurrentState, listRoutes, loadRoute, deleteSavedRoute, currentLoadedState, currentLoadedPersistentId, hasUnsavedChanges } = useRouteContext();
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [loadDialogOpen, setLoadDialogOpen] = useState(false);
    const handleSaveClick = () => {
        console.log('Save clicked, current routes:', routes);
        if (routes.length === 0) {
            console.warn('No routes to save');
            return;
        }
        setSaveDialogOpen(true);
    };
    const handleLoadClick = async () => {
        console.log('Load clicked');
        try {
            await listRoutes();
            setLoadDialogOpen(true);
        }
        catch (error) {
            console.error('Failed to list routes:', error);
        }
    };
    const items = [
        {
            icon: SidebarIcons.actions.gpx,
            text: 'Add GPX',
            onClick: () => {
                onItemClick('gpx');
                onUploadGpx();
            }
        },
        {
            icon: SidebarIcons.actions.save,
            text: 'Save GPX',
            onClick: handleSaveClick,
            disabled: routes.length === 0
        },
        {
            icon: SidebarIcons.actions.load,
            text: 'Load GPX',
            onClick: handleLoadClick
        },
        {
            icon: SidebarIcons.actions.photos,
            text: 'Add Photos',
            onClick: onAddPhotos
        },
        {
            icon: SidebarIcons.actions.poi,
            text: 'Add POI',
            onClick: onAddPOI
        }
    ];
    return (_jsxs(_Fragment, { children: [_jsx(List, { children: items.map((item) => (_jsx(Tooltip, { title: item.text, placement: "right", children: _jsx(ListItem, { disablePadding: true, children: _jsx(ListItemButton, { onClick: item.onClick, disabled: item.disabled, sx: {
                                opacity: item.disabled ? 0.5 : 1,
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                }
                            }, children: _jsx(ListItemIcon, { children: _jsx(item.icon, { strokeWidth: 1.5 }) }) }) }) }, item.text))) }), _jsx(SaveDialog, { open: saveDialogOpen, onClose: () => setSaveDialogOpen(false), onSave: async (formData) => {
                    try {
                        await saveCurrentState(formData.name, formData.type, formData.isPublic);
                        setSaveDialogOpen(false);
                    }
                    catch (error) {
                        console.error('Failed to save:', error);
                    }
                }, initialValues: currentLoadedState ? {
                    name: currentLoadedState.name,
                    type: currentLoadedState.type,
                    isPublic: currentLoadedState.isPublic
                } : undefined, isEditing: !!currentLoadedPersistentId }), _jsx(LoadDialog, { open: loadDialogOpen, onClose: () => setLoadDialogOpen(false), routes: savedRoutes, onLoad: async (id) => {
                    try {
                        await loadRoute(id);
                        setLoadDialogOpen(false);
                    }
                    catch (error) {
                        console.error('Failed to load:', error);
                    }
                }, onDelete: deleteSavedRoute, hasUnsavedChanges: hasUnsavedChanges })] }));
};
