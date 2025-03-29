import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch, CircularProgress, Box, Typography } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

export const SaveDialog = ({ open, onClose, onSave, initialValues, isEditing, isSaving = false }) => {
    const [formData, setFormData] = useState({
        name: initialValues?.name || '',
        type: initialValues?.type || 'tourism',
        isPublic: initialValues?.isPublic || false,
        eventDate: initialValues?.eventDate ? dayjs(initialValues.eventDate) : null
    });

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

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            PaperProps={{
                sx: { 
                    backgroundColor: 'rgb(35, 35, 35)',
                    color: 'white'
                }
            }}
        >
            <DialogTitle>{isEditing ? 'Edit Route' : 'Save Route'}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Route Name"
                    fullWidth
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        name: e.target.value 
                    }))}
                    sx={{ 
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
                    }}
                />
                <FormControl 
                    fullWidth 
                    sx={{ 
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
                    }}
                >
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={formData.type}
                        label="Type"
                        onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            type: e.target.value 
                        }))}
                    >
                        <MenuItem value="tourism">Tourism</MenuItem>
                        <MenuItem value="event">Event</MenuItem>
                        <MenuItem value="bikepacking">Bikepacking</MenuItem>
                        <MenuItem value="single">Single</MenuItem>
                    </Select>
                </FormControl>
                
                {/* Conditionally render date picker for event type */}
                {formData.type === 'event' && (
                    <Box sx={{ mb: 2 }}>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DateTimePicker
                                label="Event Date & Time"
                                value={formData.eventDate}
                                onChange={(newDate) => setFormData(prev => ({
                                    ...prev,
                                    eventDate: newDate
                                }))}
                                format="DD/MM/YYYY HH:mm"
                                sx={{
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
                                }}
                            />
                        </LocalizationProvider>
                    </Box>
                )}
                
                <FormControlLabel
                    control={
                        <Switch
                            checked={formData.isPublic}
                            onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                isPublic: e.target.checked 
                            }))}
                            sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#90caf9'
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#90caf9'
                                }
                            }}
                        />
                    }
                    label="Make Public"
                    sx={{ color: 'white' }}
                />
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={onClose}
                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    disabled={isSaving}
                >
                    Cancel
                </Button>
                {isSaving ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, padding: '0 8px' }}>
                        <CircularProgress
                            variant="indeterminate"
                            size={32}
                            sx={{ color: '#90caf9' }}
                        />
                        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 'medium' }}>
                            Saving...
                        </Typography>
                    </Box>
                ) : (
                    <Button 
                        onClick={() => onSave(formData)}
                        disabled={!formData.name}
                        sx={{ 
                            color: formData.name ? '#90caf9' : 'rgba(255, 255, 255, 0.3)'
                        }}
                    >
                        {isEditing ? 'Update' : 'Save'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};
