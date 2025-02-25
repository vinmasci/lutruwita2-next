import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Typography, Button, DialogActions } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useState } from 'react';
const ConfirmDialog = ({ open, onClose, onConfirm }) => (_jsxs(Dialog, { open: open, onClose: onClose, PaperProps: {
        sx: {
            backgroundColor: 'rgb(35, 35, 35)',
            color: 'white'
        }
    }, children: [_jsx(DialogTitle, { children: "Unsaved Changes" }), _jsx(DialogContent, { children: _jsx(Typography, { children: "You have unsaved changes that will be lost. Do you want to continue?" }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onClose, sx: { color: 'rgba(255, 255, 255, 0.7)' }, children: "Cancel" }), _jsx(Button, { onClick: onConfirm, sx: { color: '#f44336' }, children: "Discard Changes" })] })] }));
export const LoadDialog = ({ open, onClose, routes, onLoad, onDelete, hasUnsavedChanges = false }) => {
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [pendingLoadId, setPendingLoadId] = useState(null);
    const handleLoadClick = (id) => {
        if (hasUnsavedChanges) {
            setPendingLoadId(id);
            setConfirmDialogOpen(true);
        }
        else {
            onLoad(id);
        }
    };
    const handleConfirmLoad = () => {
        if (pendingLoadId) {
            onLoad(pendingLoadId);
            setConfirmDialogOpen(false);
            setPendingLoadId(null);
        }
    };
    return (_jsxs(Dialog, { open: open, onClose: onClose, PaperProps: {
            sx: {
                backgroundColor: 'rgb(35, 35, 35)',
                color: 'white',
                minWidth: '400px',
                borderRadius: '8px'
            }
        }, children: [_jsx(DialogTitle, { sx: {
                    pb: 1,
                    fontSize: '1.5rem',
                    fontWeight: 500
                }, children: "Load Route" }), _jsx(DialogContent, { sx: { pt: '8px !important' }, children: !routes || routes.length === 0 ? (_jsx(Typography, { sx: { color: 'rgba(255, 255, 255, 0.7)' }, children: "No saved routes found" })) : (_jsx(List, { children: routes.map((route) => (_jsxs(ListItem, { component: "div", onClick: () => handleLoadClick(route.persistentId), sx: {
                            width: '100%',
                            py: 1.5,
                            px: 2,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            borderRadius: '4px',
                            mb: 0.5,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            },
                            '&:active': {
                                backgroundColor: 'rgba(255, 255, 255, 0.15)'
                            }
                        }, children: [_jsx(ListItemText, { primary: _jsx(Typography, { sx: {
                                        color: 'white',
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        mb: 0.5
                                    }, children: route.name }), secondary: _jsxs(Typography, { component: "span", sx: {
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1
                                    }, children: [_jsxs("span", { children: ["Type: ", route.type] }), route.isPublic && (_jsxs(_Fragment, { children: [_jsx("span", { style: { color: 'rgba(255, 255, 255, 0.5)' }, children: "\u2022" }), _jsx("span", { children: "Public" })] }))] }) }), onDelete && (_jsx(ListItemSecondaryAction, { children: _jsx(IconButton, { edge: "end", onClick: (e) => {
                                        e.stopPropagation();
                                        onDelete(route.persistentId);
                                    }, sx: {
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        '&:hover': {
                                            color: '#f44336',
                                            backgroundColor: 'rgba(244, 67, 54, 0.1)'
                                        },
                                        transition: 'all 0.2s'
                                    }, children: _jsx(Delete, {}) }) }))] }, route.id))) })) }), _jsx(ConfirmDialog, { open: confirmDialogOpen, onClose: () => {
                    setConfirmDialogOpen(false);
                    setPendingLoadId(null);
                }, onConfirm: handleConfirmLoad })] }));
};
