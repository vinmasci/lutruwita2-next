import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useRouteState } from '../../hooks/useRouteState';
import { List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, CircularProgress, Alert, Snackbar, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, InputLabel, Select, FormControlLabel, Switch, ClickAwayListener, } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { styled } from '@mui/material/styles';
const StyledListItem = styled(ListItem)(({ theme }) => ({
    backgroundColor: 'rgba(35, 35, 35, 0.9)',
    marginBottom: '8px',
    borderRadius: '4px',
    transition: 'all 0.2s ease-in-out',
    border: '1px solid transparent',
    '&:hover': {
        backgroundColor: 'rgba(45, 45, 45, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transform: 'translateX(4px)',
    },
    '&.selected': {
        backgroundColor: 'rgba(55, 55, 55, 0.95)',
        borderLeft: '3px solid #4a9eff',
        paddingLeft: '13px',
    }
}));
const SaveDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        backgroundColor: 'rgba(35, 35, 35, 0.95)',
        color: 'white',
        minWidth: '400px',
    }
}));
export const RouteList = () => {
    const { routes, currentRoute, savedRoutes, isSaving, isLoading, error, saveRoute, loadRoute, listRoutes, deleteRoute, clearError, focusRoute, unfocusRoute, getFocusedRoute, updateRoute, } = useRouteState();
    const [editingRouteId, setEditingRouteId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [saveForm, setSaveForm] = useState({
        name: '',
        type: 'tourism',
        isPublic: false,
    });
    const [showSuccess, setShowSuccess] = useState(false);
    useEffect(() => {
        listRoutes();
    }, [listRoutes]);
    const handleSaveClick = () => {
        console.log('Save button clicked, opening dialog');
        setSaveDialogOpen(true);
    };
    const handleSaveConfirm = async () => {
        try {
            console.log('Attempting to save route with form:', saveForm);
            await saveRoute(saveForm);
            console.log('Route saved successfully');
            setSaveDialogOpen(false);
            setShowSuccess(true);
            setSaveForm({ name: '', type: 'tourism', isPublic: false });
        }
        catch (err) {
            // Error will be handled by the error state
        }
    };
    const handleLoadClick = async (id) => {
        try {
            await loadRoute(id);
            setShowSuccess(true);
        }
        catch (err) {
            // Error will be handled by the error state
        }
    };
    const handleDeleteClick = async (e, id) => {
        e.stopPropagation();
        try {
            await deleteRoute(id);
            setShowSuccess(true);
        }
        catch (err) {
            // Error will be handled by the error state
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs(List, { sx: { width: '100%', padding: 2 }, children: [_jsx(Button, { variant: "contained", startIcon: _jsx(SaveIcon, {}), onClick: handleSaveClick, disabled: routes.length === 0 || isSaving, fullWidth: true, sx: { marginBottom: 2 }, children: isSaving ? _jsx(CircularProgress, { size: 24 }) : 'Save Current Route' }), routes.map((route) => (_jsx(StyledListItem, { className: `${currentRoute?.routeId === route.routeId ? 'selected' : ''} ${route.isFocused ? 'focused' : ''}`, sx: {
                            cursor: 'pointer',
                            '&.focused': {
                                backgroundColor: 'rgba(74, 158, 255, 0.15)',
                                borderLeft: '3px solid #4a9eff',
                            }
                        }, children: editingRouteId === route.routeId ? (_jsx(ClickAwayListener, { onClickAway: () => setEditingRouteId(null), children: _jsx(TextField, { value: editingName, onChange: (e) => setEditingName(e.target.value), onKeyDown: (e) => {
                                    if (e.key === 'Enter') {
                                        updateRoute(route.routeId, { name: editingName });
                                        setEditingRouteId(null);
                                    }
                                    else if (e.key === 'Escape') {
                                        setEditingRouteId(null);
                                    }
                                }, autoFocus: true, fullWidth: true, size: "small", sx: {
                                    '& .MuiInputBase-root': {
                                        color: 'white',
                                        '& fieldset': {
                                            borderColor: 'rgba(255, 255, 255, 0.23)'
                                        },
                                        '&:hover fieldset': {
                                            borderColor: 'rgba(255, 255, 255, 0.4)'
                                        }
                                    }
                                } }) })) : (_jsx(ListItemText, { primary: route.name, secondary: `${(route.statistics.totalDistance / 1000).toFixed(1)}km`, sx: { color: 'white' }, onClick: () => {
                                if (route.isFocused) {
                                    unfocusRoute(route.routeId);
                                }
                                else {
                                    focusRoute(route.routeId);
                                }
                            }, onDoubleClick: () => {
                                setEditingRouteId(route.routeId);
                                setEditingName(route.name);
                            } })) }, route.id))), routes.length > 0 && savedRoutes.length > 0 && (_jsx(ListItem, { sx: { justifyContent: 'center', padding: '16px 0' }, children: _jsx(ListItemText, { primary: "Saved Routes", sx: { textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' } }) })), isLoading ? (_jsx(ListItem, { sx: { justifyContent: 'center' }, children: _jsx(CircularProgress, {}) })) : (savedRoutes.map((route) => (_jsxs(StyledListItem, { onClick: () => handleLoadClick(route.id), sx: { cursor: 'pointer' }, children: [_jsx(ListItemText, { primary: route.name, secondary: `Type: ${route.type}`, sx: { color: 'white' } }), _jsx(ListItemSecondaryAction, { children: _jsx(IconButton, { edge: "end", "aria-label": "delete", onClick: (e) => handleDeleteClick(e, route.id), sx: { color: 'rgba(255, 255, 255, 0.7)' }, children: _jsx(DeleteIcon, {}) }) })] }, route.id))))] }), _jsxs(SaveDialog, { open: saveDialogOpen, onClose: () => setSaveDialogOpen(false), children: [_jsx(DialogTitle, { children: "Save Route" }), _jsxs(DialogContent, { children: [_jsx(TextField, { autoFocus: true, margin: "dense", label: "Route Name", fullWidth: true, value: saveForm.name, onChange: (e) => setSaveForm(prev => ({ ...prev, name: e.target.value })), sx: { marginBottom: 2 } }), _jsxs(FormControl, { fullWidth: true, sx: { marginBottom: 2 }, children: [_jsx(InputLabel, { children: "Type" }), _jsxs(Select, { value: saveForm.type, label: "Type", onChange: (e) => setSaveForm(prev => ({
                                            ...prev,
                                            type: e.target.value
                                        })), children: [_jsx(MenuItem, { value: "tourism", children: "Tourism" }), _jsx(MenuItem, { value: "event", children: "Event" }), _jsx(MenuItem, { value: "bikepacking", children: "Bikepacking" }), _jsx(MenuItem, { value: "single", children: "Single" })] })] }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: saveForm.isPublic, onChange: (e) => setSaveForm(prev => ({
                                        ...prev,
                                        isPublic: e.target.checked
                                    })) }), label: "Make Public" })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setSaveDialogOpen(false), children: "Cancel" }), _jsx(Button, { onClick: handleSaveConfirm, disabled: !saveForm.name || isSaving, children: isSaving ? _jsx(CircularProgress, { size: 24 }) : 'Save' })] })] }), _jsx(Snackbar, { open: !!error, autoHideDuration: 6000, onClose: clearError, children: _jsx(Alert, { onClose: clearError, severity: "error", sx: { width: '100%' }, children: error }) }), _jsx(Snackbar, { open: showSuccess, autoHideDuration: 3000, onClose: () => setShowSuccess(false), children: _jsx(Alert, { onClose: () => setShowSuccess(false), severity: "success", sx: { width: '100%' }, children: "Operation completed successfully" }) })] }));
};
