import React, { useState } from 'react';
import { PhotoUploaderUIProps } from './PhotoUploader.types';
import { Alert, Box, CircularProgress, Typography, IconButton, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, Paper, Divider } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useDropzone, FileWithPath } from 'react-dropzone';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

interface EditingState {
  photoId: string;
  newName: string;
}

const PhotoUploaderUI: React.FC<PhotoUploaderUIProps> = ({
  isLoading,
  error,
  onFileAdd,
  onFileDelete,
  onFileRename,
}) => {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif']
    },
    onDrop: (acceptedFiles: FileWithPath[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        // Create preview URL
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        onFileAdd(file);
        
        // Clean up preview URL when component unmounts
        return () => URL.revokeObjectURL(objectUrl);
      }
    },
  });

  const handleStartEditing = (e: React.MouseEvent, photoId: string, currentName: string) => {
    e.stopPropagation();
    setEditing({ photoId, newName: currentName });
  };

  const handleCancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(null);
  };

  const handleSaveEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editing) {
      onFileRename(editing.photoId, editing.newName);
      setEditing(null);
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
            {previewUrl ? (
              <Box
                component="img"
                src={previewUrl}
                alt="Preview"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
              />
            ) : (
              <>
                <UploadFileIcon sx={{ fontSize: 36, opacity: 0.8 }} />
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                  {isDragActive ? 'Drop the photo here...' : 'Drop photo here or click to upload'}
                </Typography>
              </>
            )}
          </>
        )}
      </Paper>

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

export default PhotoUploaderUI;
