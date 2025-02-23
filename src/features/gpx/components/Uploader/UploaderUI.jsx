import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Alert, Box, Button, CircularProgress, Typography, IconButton, TextField, List, Paper, Divider, Popover } from '@mui/material';
import { useRouteContext } from '../../../map/context/RouteContext';
import { getRouteDistance, getUnpavedPercentage, getElevationGain, getElevationLoss } from '../../utils/routeUtils';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useDropzone } from 'react-dropzone';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableRouteItem } from './DraggableRouteItem';
import { PRESET_COLORS, validateHexColor } from './constants';

const ColorButton = ({ color, onClick, sx }) => (
    <Box
        onClick={onClick}
        sx={{
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            cursor: 'pointer',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.2s ease-in-out',
            backgroundColor: color,
            '&:hover': {
                transform: 'scale(1.1)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
            },
            ...sx
        }}
    />
);

const UploaderUI = ({ isLoading, error, onFileAdd, onFileDelete, onFileRename }) => {
    const [editing, setEditing] = useState(null);
    const { routes, currentRoute, setCurrentRoute, reorderRoutes, updateRoute } = useRouteContext();
    const [localRoutes, setLocalRoutes] = useState(routes);
    const [colorPickerAnchor, setColorPickerAnchor] = useState(null);
    const [selectedRouteId, setSelectedRouteId] = useState(null);
    const [customColor, setCustomColor] = useState('');
    const [customColorError, setCustomColorError] = useState('');

    useEffect(() => {
        setLocalRoutes(routes);
    }, [routes]);
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'application/gpx+xml': ['.gpx'],
            'text/xml': ['.gpx'],
        },
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                onFileAdd(acceptedFiles[0]);
            }
        },
        noDragEventsBubbling: true,
    });

    const handleStartEditing = (e, fileId, currentName) => {
        e.preventDefault();
        e.stopPropagation();
        setEditing({ fileId, newName: currentName });
    };

    const handleCancelEditing = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditing(null);
    };

    const handleSaveEditing = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (editing?.fileId && editing.newName.trim()) {
            onFileRename(editing.fileId, editing.newName.trim());
            setEditing(null);
        }
    };

    const handleEditingChange = (e) => {
        e.stopPropagation();
        if (editing) {
            setEditing({ ...editing, newName: e.target.value });
        }
    };

    const handleColorClick = (e, routeId) => {
        e.stopPropagation();
        setColorPickerAnchor(e.currentTarget);
        setSelectedRouteId(routeId);
    };

    const handleColorClose = () => {
        setColorPickerAnchor(null);
        setSelectedRouteId(null);
    };

    const handleColorSelect = (color) => {
        if (selectedRouteId) {
            updateRoute(selectedRouteId, { color });
            handleColorClose();
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        
        if (active && over && active.id !== over.id) {
            const oldIndex = localRoutes.findIndex(route => (route.routeId || route.id) === active.id);
            const newIndex = localRoutes.findIndex(route => (route.routeId || route.id) === over.id);
            
            if (oldIndex !== -1 && newIndex !== -1) {
                // Update local state for immediate visual feedback
                const newRoutes = [...localRoutes];
                const [movedRoute] = newRoutes.splice(oldIndex, 1);
                newRoutes.splice(newIndex, 0, movedRoute);
                setLocalRoutes(newRoutes);
                
                // Update context state with proper order field
                reorderRoutes(oldIndex, newIndex);
            }
        }
    };

    const renderRouteContent = (route) => {
        if (editing?.fileId === (route.routeId || route.id)) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <TextField
                        size="small"
                        value={editing?.newName || ''}
                        onChange={handleEditingChange}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                                handleSaveEditing(e);
                            }
                            else if (e.key === 'Escape') {
                                handleCancelEditing(e);
                            }
                        }}
                        sx={{ flex: 1 }}
                    />
                    <IconButton size="small" onClick={handleSaveEditing}>
                        <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={handleCancelEditing}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            );
        }

        return (
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    {/* Title row */}
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 'normal', mb: 0.25 }}>{route.name}</Typography>

                    {/* Distance row with edit/delete buttons */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '20px' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <i className="fa-solid fa-route" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> {(getRouteDistance(route) / 1000).toFixed(1)}km
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, position: 'absolute', right: '36px', top: '32px' }}>
                            <IconButton
                                size="small"
                                onClick={(e) => handleStartEditing(e, route.routeId || route.id, route.name)}
                                title="Rename route"
                                sx={{ padding: '2px' }}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFileDelete(route.routeId || route.id);
                                }}
                                title="Delete route"
                                sx={{ padding: '2px' }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        <Box sx={{ position: 'absolute', right: '12px', top: '60px' }}>
                            <ColorButton
                                color={route.color || '#ee5253'}
                                onClick={(e) => handleColorClick(e, route.routeId || route.id)}
                                sx={{ width: '18px', height: '18px' }}
                            />
                        </Box>
                    </Box>

                    {/* Unpaved row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '20px' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <i className="fa-solid fa-person-biking-mountain" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> {getUnpavedPercentage(route)}% unpaved
                        </Typography>
                    </Box>

                    {/* Elevation row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '20px' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.7 }}>
                            <i className="fa-solid fa-up-right" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> &nbsp;{Math.round(getElevationGain(route)).toLocaleString()}m
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <i className="fa-solid fa-down-right" style={{ color: '#2196f3', fontSize: '0.75rem' }} /> {Math.round(getElevationLoss(route)).toLocaleString()}m
                        </Typography>
                    </Box>
                </Box>
        );
    };

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '24px 16px',
            width: '100%'
        }}>
            <Paper
                {...getRootProps()}
                elevation={0}
                sx={{
                    width: '220px',
                    minHeight: '120px',
                    padding: '20px',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    backgroundColor: 'rgba(35, 35, 35, 0.9)',
                    border: '2px dashed rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    '&:hover': {
                        backgroundColor: 'rgba(45, 45, 45, 0.9)',
                        border: '2px dashed rgba(255, 255, 255, 0.3)',
                    },
                    ...(isDragActive && {
                        backgroundColor: 'rgba(55, 55, 55, 0.9)',
                        border: '2px dashed rgba(255, 255, 255, 0.5)',
                        transform: 'scale(0.98)',
                    })
                }}
            >
                <input {...getInputProps()} />
                {isLoading ? (
                    <CircularProgress size={32} />
                ) : (
                    <>
                        <UploadFileIcon sx={{ fontSize: 36, opacity: 0.8 }} />
                        <Typography variant="body2" sx={{ textAlign: 'center' }}>
                            {isDragActive ? 'Drop the GPX file here...' : 'Drop GPX file here or click to upload'}
                        </Typography>
                    </>
                )}
            </Paper>

            <Divider sx={{ my: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)', width: '100%' }} />

            {localRoutes.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={localRoutes.map(route => route.routeId || route.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <List sx={{ width: '240px' }}>
                            {localRoutes.map((route) => (
                                <DraggableRouteItem
                                    key={route.routeId || route.id}
                                    route={route}
                                >
                                    <Box
                                        onClick={() => setCurrentRoute(route)}
                                        sx={{
                                            backgroundColor: currentRoute?.routeId === route.routeId ? 'rgba(74, 158, 255, 0.15)' : 'rgba(35, 35, 35, 0.9)',
                                            borderRadius: '4px',
                                            mb: 1,
                                            padding: '6px 36px 6px 8px',
                                            transition: 'all 0.2s ease-in-out',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            outline: 'none',
                                            border: currentRoute?.routeId === route.routeId ? '1px solid rgba(74, 158, 255, 0.5)' : '1px solid transparent',
                                            '&:hover': {
                                                backgroundColor: currentRoute?.routeId === route.routeId ? 'rgba(74, 158, 255, 0.2)' : 'rgba(45, 45, 45, 0.9)',
                                                transform: 'scale(1.02)',
                                            },
                                            '&:focus-visible': {
                                                outline: '2px solid rgba(255, 255, 255, 0.5)',
                                                outlineOffset: '-2px',
                                            },
                                            minHeight: '72px'
                                        }}
                                    >
                                        {renderRouteContent(route)}
                                    </Box>
                                </DraggableRouteItem>
                            ))}
                        </List>
                    </SortableContext>
                </DndContext>
            )}

            <Popover
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={handleColorClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <Box sx={{ 
                    p: 1.5,
                    backgroundColor: 'rgba(35, 35, 35, 0.95)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                }}>
                    <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(8, 1fr)', 
                        gap: 0.5
                    }}>
                        {PRESET_COLORS.map((color) => (
                            <ColorButton
                                key={color}
                                color={color}
                                onClick={() => handleColorSelect(color)}
                            />
                        ))}
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                        <TextField
                            label="Custom Color"
                            placeholder="#RRGGBB"
                            value={customColor}
                            onChange={(e) => {
                                const value = e.target.value;
                                setCustomColor(value);
                                if (value && !validateHexColor(value)) {
                                    setCustomColorError('Invalid hex color');
                                } else {
                                    setCustomColorError('');
                                }
                            }}
                            error={!!customColorError}
                            helperText={customColorError}
                            size="small"
                            sx={{
                                flex: 1,
                                '& .MuiInputBase-root': {
                                    color: 'white',
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.23)',
                                },
                            }}
                        />
                        <Button
                            variant="contained"
                            disabled={!customColor || !!customColorError}
                            onClick={() => {
                                if (customColor && !customColorError) {
                                    handleColorSelect(customColor);
                                    setCustomColor('');
                                }
                            }}
                            sx={{ minWidth: 'auto' }}
                        >
                            Apply
                        </Button>
                    </Box>
                </Box>
            </Popover>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error.message}
                    {error.details && (
                        <Typography variant="caption" display="block">
                            {error.details}
                        </Typography>
                    )}
                </Alert>
            )}
        </Box>
    );
};

UploaderUI.propTypes = {
    isLoading: PropTypes.bool,
    error: PropTypes.shape({
        message: PropTypes.string,
        details: PropTypes.string,
    }),
    onFileAdd: PropTypes.func.isRequired,
    onFileDelete: PropTypes.func.isRequired,
    onFileRename: PropTypes.func.isRequired,
};

export default UploaderUI;
