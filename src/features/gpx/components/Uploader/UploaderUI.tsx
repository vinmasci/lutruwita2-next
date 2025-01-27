import React, { useState } from 'react';
import { UploaderUIProps } from './Uploader.types';
import { Alert, Box, CircularProgress, Typography, IconButton, TextField, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
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
  onFileAdd,
  onFileDelete,
  onFileRename,
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

  const handleStartEditing = (fileId: string, currentName: string) => {
    setEditing({ fileId, newName: currentName });
  };

  const handleCancelEditing = () => {
    setEditing(null);
  };

  const handleSaveEditing = () => {
    if (editing) {
      onFileRename(editing.fileId, editing.newName);
      setEditing(null);
    }
  };

  return (
    <Box sx={{ 
      width: '100%', 
      pt: 2,
      px: 0.5,
      pb: 0.5,
      maxWidth: '220px',
      margin: '0 auto'
    }}>
      <div
        {...getRootProps()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '4px',
          padding: '12px',
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        <input {...getInputProps()} />
        {isLoading ? (
          <CircularProgress size={24} />
        ) : isDragActive ? (
          <Typography>Drop the GPX file here...</Typography>
        ) : (
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            Drop GPX file here or click
          </Typography>
        )}
      </div>

      {files.length > 0 && (
        <List sx={{ mt: 2 }}>
          {files.map((file) => (
            <ListItem
              key={file.id}
              sx={{
                border: '1px solid #eee',
                borderRadius: '4px',
                mb: 1,
                padding: '4px 8px',
              }}
            >
              {editing?.fileId === file.id ? (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <TextField
                    size="small"
                    value={editing.newName}
                    onChange={(e) => setEditing({ ...editing, newName: e.target.value })}
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
                      onClick={() => handleStartEditing(file.id, file.customName || file.name)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => onFileDelete(file.id)}
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
