import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch } from '@mui/material';
export const SaveDialog = ({ open, onClose, onSave, initialValues, isEditing }) => {
    const [formData, setFormData] = useState({
        name: initialValues?.name || '',
        type: initialValues?.type || 'tourism',
        isPublic: initialValues?.isPublic || false
    });
    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setFormData({
                name: initialValues?.name || '',
                type: initialValues?.type || 'tourism',
                isPublic: initialValues?.isPublic || false
            });
        }
    }, [open, initialValues]);
    return (_jsxs(Dialog, { open: open, onClose: onClose, PaperProps: {
            sx: {
                backgroundColor: 'rgb(35, 35, 35)',
                color: 'white'
            }
        }, children: [_jsx(DialogTitle, { children: isEditing ? 'Edit Route' : 'Save Route' }), _jsxs(DialogContent, { children: [_jsx(TextField, { autoFocus: true, margin: "dense", label: "Route Name", fullWidth: true, value: formData.name, onChange: (e) => setFormData(prev => ({
                            ...prev,
                            name: e.target.value
                        })), sx: {
                            mb: 2,
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)'
                            },
                            '& .MuiOutlinedInput-root': {
                                color: 'white',
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.23)'
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.4)'
                                }
                            }
                        } }), _jsxs(FormControl, { fullWidth: true, sx: {
                            mb: 2,
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)'
                            },
                            '& .MuiOutlinedInput-root': {
                                color: 'white',
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.23)'
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.4)'
                                }
                            },
                            '& .MuiSelect-icon': {
                                color: 'rgba(255, 255, 255, 0.7)'
                            }
                        }, children: [_jsx(InputLabel, { children: "Type" }), _jsxs(Select, { value: formData.type, label: "Type", onChange: (e) => setFormData(prev => ({
                                    ...prev,
                                    type: e.target.value
                                })), children: [_jsx(MenuItem, { value: "tourism", children: "Tourism" }), _jsx(MenuItem, { value: "event", children: "Event" }), _jsx(MenuItem, { value: "bikepacking", children: "Bikepacking" }), _jsx(MenuItem, { value: "single", children: "Single" })] })] }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: formData.isPublic, onChange: (e) => setFormData(prev => ({
                                ...prev,
                                isPublic: e.target.checked
                            })), sx: {
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#90caf9'
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#90caf9'
                                }
                            } }), label: "Make Public", sx: { color: 'white' } })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onClose, sx: { color: 'rgba(255, 255, 255, 0.7)' }, children: "Cancel" }), _jsx(Button, { onClick: () => onSave(formData), disabled: !formData.name, sx: {
                            color: formData.name ? '#90caf9' : 'rgba(255, 255, 255, 0.3)'
                        }, children: isEditing ? 'Update' : 'Save' })] })] }));
};
