import React, { useState } from 'react';
import { UploaderUIProps } from './Uploader.types';
import { Alert, Box, CircularProgress, Typography, IconButton, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, Paper, Divider } from '@mui/material';
import { useRouteContext } from '../../../map/context/RouteContext';
import { getRouteDistance, getUnpavedPercentage, getElevationGain } from '../../utils/routeUtils';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useDropzone, FileWithPath } from 'react-dropzone';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

interface EditingState {
  fileId: string;
  newName: string;
}

const UploaderUI: React.FC<UploaderUIProps> = ({
  isLoading,
  error,
  onFileAdd,
  onFileDelete,
  onFileRename,
}) => {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const { routes, currentRoute, setCurrentRoute } = useRouteContext();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/gpx+xml': ['.gpx'],
      'text/xml': ['.gpx'],
    },
    onDrop: (acceptedFiles: FileWithPath[]) => {
      if (acceptedFiles.length > 0) {
        onFileAdd(acceptedFiles[0]);
      }
    },
  });

  // Safe editing handlers with proper event handling and type safety
  const handleStartEditing = (e: React.MouseEvent, fileId: string, currentName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing({ fileId, newName: currentName });
  };

  const handleCancelEditing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(null);
  };

  const handleSaveEditing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editing?.fileId && editing.newName.trim()) {
      onFileRename(editing.fileId, editing.newName.trim());
      setEditing(null);
    }
  };

  const handleEditingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (editing) {
      setEditing({ ...editing, newName: e.target.value });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, route: typeof routes[0]) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setCurrentRoute(route);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = routes.findIndex(r => r.routeId === route.routeId) - 1;
        if (prevIndex >= 0) {
          setCurrentRoute(routes[prevIndex]);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = routes.findIndex(r => r.routeId === route.routeId) + 1;
        if (nextIndex < routes.length) {
          setCurrentRoute(routes[nextIndex]);
        }
        break;
    }
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
      
      {routes.length > 0 && (
        <List sx={{ width: '240px' }}>
          {routes.map((route) => (
            <ListItem
              key={route.routeId || route.id}
              onClick={() => setCurrentRoute(route)}
              onKeyDown={(e) => handleKeyDown(e, route)}
              tabIndex={0}
              role="button"
              aria-selected={currentRoute?.routeId === route.routeId}
              sx={{
                backgroundColor: currentRoute?.routeId === route.routeId ? 'rgba(74, 158, 255, 0.15)' : 'rgba(35, 35, 35, 0.9)',
                borderRadius: '4px',
                mb: 1,
                padding: '8px 12px',
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
                '&::before': {
                  content: `"${routes.indexOf(route) + 1}."`,
                  position: 'absolute',
                  left: '-24px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.875rem'
                }
              }}
            >
              {editing?.fileId === (route.routeId || route.id) && editing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <TextField
                    size="small"
                    value={editing?.newName || ''}
                    onChange={handleEditingChange}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        handleSaveEditing(e as unknown as React.MouseEvent);
                      } else if (e.key === 'Escape') {
                        handleCancelEditing(e as unknown as React.MouseEvent);
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
              ) : (
                <>
                  <ListItemText 
                    primary={route.name}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i className="fa-solid fa-route" /> {(getRouteDistance(route) / 1000).toFixed(1)}km
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i className="fa-solid fa-mountains" /> {Math.round(getElevationGain(route)).toLocaleString()}m
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i className="fa-solid fa-person-biking-mountain" /> {getUnpavedPercentage(route)}% unpaved
                        </Typography>
                      </Box>
                    }
                    sx={{ 
                      '& .MuiTypography-root': { 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }
                    }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => handleStartEditing(e, route.routeId || route.id, route.name)}
                      title="Rename route"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileDelete(route.routeId || route.id);
                      }}
                      title="Delete route"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </>
              )}
            </ListItem>
          ))}
        </List>
      )}

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

export default UploaderUI;
