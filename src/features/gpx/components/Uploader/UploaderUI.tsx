import React, { useState } from 'react';
import { UploaderUIProps } from './Uploader.types';
import { Alert, Box, CircularProgress, Typography, IconButton, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, Paper } from '@mui/material';
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
  files,
  isLoading,
  error,
  selectedFileId,
  onFileAdd,
  onFileDelete,
  onFileRename,
  onFileSelect,
}) => {
  const [editing, setEditing] = useState<EditingState | null>(null);

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

  const handleStartEditing = (e: React.MouseEvent, fileId: string, currentName: string) => {
    e.stopPropagation();
    setEditing({ fileId, newName: currentName });
  };

  const handleCancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(null);
  };

  const handleSaveEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editing) {
      onFileRename(editing.fileId, editing.newName);
      setEditing(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, fileId: string) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onFileSelect(fileId);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = files.findIndex(f => f.id === fileId) - 1;
        if (prevIndex >= 0) {
          onFileSelect(files[prevIndex].id);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = files.findIndex(f => f.id === fileId) + 1;
        if (nextIndex < files.length) {
          onFileSelect(files[nextIndex].id);
        }
        break;
    }
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 32px 24px 1px',
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

      {files.length > 0 && (
        <List sx={{ width: '240px' }}>
          {files.map((file) => (
            <ListItem
              key={file.id}
              onClick={() => onFileSelect(file.id)}
              onKeyDown={(e) => handleKeyDown(e, file.id)}
              tabIndex={0}
              role="button"
              aria-selected={file.id === selectedFileId}
              sx={{
                backgroundColor: file.id === selectedFileId ? 'rgba(55, 55, 55, 0.9)' : 'rgba(35, 35, 35, 0.9)',
                borderRadius: '4px',
                mb: 1,
                padding: '8px 12px',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                position: 'relative',
                outline: 'none',
                '&:hover': {
                  backgroundColor: file.id === selectedFileId ? 'rgba(65, 65, 65, 0.9)' : 'rgba(45, 45, 45, 0.9)',
                },
                '&:focus-visible': {
                  outline: '2px solid rgba(255, 255, 255, 0.5)',
                  outlineOffset: '-2px',
                },
                '&::before': {
                  content: `"${files.indexOf(file) + 1}."`,
                  position: 'absolute',
                  left: '-24px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.875rem'
                }
              }}
            >
              {editing?.fileId === file.id ? (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <TextField
                    size="small"
                    value={editing.newName}
                    onChange={(e) => setEditing({ ...editing, newName: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
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
                    primary={file.customName || file.name}
                    sx={{ 
                      '& .MuiTypography-root': { 
                        fontSize: '0.875rem',
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
                      onClick={(e) => handleStartEditing(e, file.id, file.customName || file.name)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileDelete(file.id);
                      }}
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
