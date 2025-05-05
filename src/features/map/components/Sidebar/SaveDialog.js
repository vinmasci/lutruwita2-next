import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, Box, CircularProgress, Typography, LinearProgress } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

export const SaveDialog = ({ open, onClose, onSave, initialValues, isEditing, isSaving = false, progress: externalProgress, logs = [] }) => {
    const [formData, setFormData] = useState({
        name: initialValues?.name || '',
        type: initialValues?.type || 'tourism',
        isPublic: initialValues?.isPublic || false,
        eventDate: initialValues?.eventDate ? dayjs(initialValues.eventDate) : null
    });
    
    // Progress indicator state
    const [progress, setProgress] = useState(0);
    const [progressStage, setProgressStage] = useState('');
    const progressInterval = useRef(null);
    
    // Ref for auto-scrolling logs
    const logContainerRef = useRef(null);
    
    // Auto-scroll logs to bottom when they update
    useEffect(() => {
        if (logContainerRef.current && logs.length > 0) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);
    
    // Update progress when external progress changes
    useEffect(() => {
        if (externalProgress !== undefined) {
            setProgress(externalProgress);
            
            // Update stage based on progress
            if (externalProgress <= 25) {
                setProgressStage('Processing route data');
            } else if (externalProgress > 25 && externalProgress <= 50) {
                setProgressStage('Uploading photos');
            } else if (externalProgress > 50 && externalProgress <= 75) {
                setProgressStage('Generating map tiles');
            } else if (externalProgress > 75) {
                setProgressStage('Finalizing');
            }
        }
    }, [externalProgress]);

    // Simulate progress when saving starts/stops and no external progress is provided
    useEffect(() => {
        // Only simulate progress if external progress is not provided
        if (isSaving && externalProgress === undefined) {
            // Reset progress when saving starts
            setProgress(0);
            setProgressStage('Processing route data');
            
            // Simulate progress updates
            progressInterval.current = setInterval(() => {
                setProgress(prev => {
                    const newProgress = prev + (Math.random() * 2);
                    
                    // Update stage based on progress
                    if (newProgress > 25 && newProgress <= 50 && progressStage !== 'Uploading photos') {
                        setProgressStage('Uploading photos');
                    } else if (newProgress > 50 && newProgress <= 75 && progressStage !== 'Generating map tiles') {
                        setProgressStage('Generating map tiles');
                    } else if (newProgress > 75 && newProgress < 95 && progressStage !== 'Finalizing') {
                        setProgressStage('Finalizing');
                    }
                    
                    return newProgress > 95 ? 95 : newProgress;
                });
            }, 300);
            
            return () => {
                if (progressInterval.current) {
                    clearInterval(progressInterval.current);
                }
            };
        } else if (!isSaving) {
            // Clear interval when saving stops
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
                progressInterval.current = null;
            }
            
            // Reset progress when saving is complete
            setProgress(0);
            setProgressStage('');
        }
    }, [isSaving, externalProgress, progressStage]);
    
    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setFormData({
                name: initialValues?.name || '',
                type: initialValues?.type || 'tourism',
                isPublic: initialValues?.isPublic || false,
                eventDate: initialValues?.eventDate ? dayjs(initialValues.eventDate) : null
            });
        }
    }, [open, initialValues]);
    
    return (_jsxs(Dialog, { 
        open: open, 
        onClose: onClose, 
        PaperProps: {
            sx: {
                backgroundColor: 'rgb(35, 35, 35)',
                color: 'white'
            }
        }, 
        children: [
            _jsx(DialogTitle, { 
                children: isEditing ? 'Edit Route' : 'Save Route' 
            }), 
            _jsxs(DialogContent, { 
                children: [
                    _jsx(TextField, { 
                        autoFocus: true, 
                        margin: "dense", 
                        label: "Route Name", 
                        fullWidth: true, 
                        value: formData.name, 
                        onChange: (e) => setFormData(prev => ({
                            ...prev,
                            name: e.target.value
                        })), 
                        sx: {
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
                        } 
                    }), 
                    _jsxs(FormControl, { 
                        fullWidth: true, 
                        sx: {
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
                        }, 
                        children: [
                            _jsx(InputLabel, { children: "Type" }), 
                            _jsxs(Select, { 
                                value: formData.type, 
                                label: "Type", 
                                onChange: (e) => setFormData(prev => ({
                                    ...prev,
                                    type: e.target.value
                                })), 
                                children: [
                                    _jsx(MenuItem, { value: "tourism", children: "Tourism" }), 
                                    _jsx(MenuItem, { value: "event", children: "Event" }), 
                                    _jsx(MenuItem, { value: "bikepacking", children: "Bikepacking" }), 
                                    _jsx(MenuItem, { value: "single", children: "Single" })
                                ] 
                            })
                        ] 
                    }),
                    
                    // Conditionally render date picker for event type
                    formData.type === 'event' && _jsx(Box, {
                        sx: { mb: 2 },
                        children: _jsx(LocalizationProvider, {
                            dateAdapter: AdapterDayjs,
                            children: _jsx(DatePicker, {
                                label: "Event Date",
                                value: formData.eventDate,
                                onChange: (newDate) => setFormData(prev => ({
                                    ...prev,
                                    eventDate: newDate
                                })),
                                sx: {
                                    width: '100%',
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
                                    '& .MuiSvgIcon-root': {
                                        color: 'rgba(255, 255, 255, 0.7)'
                                    }
                                }
                            })
                        })
                    }),
                    
                    _jsx(FormControlLabel, { 
                        control: _jsx(Switch, { 
                            checked: formData.isPublic, 
                            onChange: (e) => setFormData(prev => ({
                                ...prev,
                                isPublic: e.target.checked
                            })), 
                            sx: {
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#90caf9'
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#90caf9'
                                }
                            } 
                        }), 
                        label: "Make Public", 
                        sx: { color: 'white' } 
                    })
                ] 
            }), 
            _jsxs(DialogActions, { 
                children: [
                    _jsx(Button, { 
                        onClick: onClose, 
                        sx: { color: 'rgba(255, 255, 255, 0.7)' },
                        disabled: isSaving,
                        children: "Cancel" 
                    }),
                    
                    
                    isSaving ? 
                    _jsxs(Box, {
                        sx: { 
                            display: 'flex', 
                            flexDirection: 'column', 
                            width: '100%', 
                            padding: '0 8px' 
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
                                    _jsx(CircularProgress, {
                                        variant: "indeterminate",
                                        size: 24,
                                        sx: { color: '#90caf9' }
                                    }),
                                    _jsx(Typography, {
                                        variant: "body1",
                                        sx: { 
                                            color: 'rgba(255, 255, 255, 0.9)', 
                                            fontWeight: 'medium' 
                                        },
                                        children: `Saving... ${Math.round(progress)}%`
                                    })
                                ]
                            }),
                            
                            _jsx(Box, {
                                sx: { width: '100%', mb: 1 },
                                children: _jsx(LinearProgress, {
                                    variant: "determinate",
                                    value: progress,
                                    sx: {
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: '#90caf9',
                                            borderRadius: 4
                                        }
                                    }
                                })
                            }),
                            
                            _jsx(Typography, {
                                variant: "caption",
                                sx: {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    alignSelf: 'flex-start',
                                    mb: 1
                                },
                                children: `${progressStage} (${Math.round(progress)}%)`
                            }),
                            
                        ]
                    }) :
                    _jsx(Button, { 
                        onClick: () => onSave(formData), 
                        disabled: !formData.name, 
                        sx: {
                            color: formData.name ? '#90caf9' : 'rgba(255, 255, 255, 0.3)'
                        }, 
                        children: isEditing ? 'Update' : 'Save' 
                    })
                ] 
            })
        ] 
    }));
};
