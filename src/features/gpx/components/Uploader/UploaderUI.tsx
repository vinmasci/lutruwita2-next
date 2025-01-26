import React from 'react';
import { UploaderUIProps } from './Uploader.types';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { useDropzone, FileWithPath } from 'react-dropzone';

const UploaderUI: React.FC<UploaderUIProps> = ({
  file,
  isLoading,
  error,
  onFileChange,
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/gpx+xml': ['.gpx'],
      'text/xml': ['.gpx'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles: FileWithPath[]) => {
      if (acceptedFiles.length > 0) {
        onFileChange(acceptedFiles[0]);
      }
    },
  });

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <div
        {...getRootProps()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '4px',
          padding: '20px',
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
          <Typography>
            {file ? file.name : 'Drag & drop a GPX file here, or click to select'}
          </Typography>
        )}
      </div>
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
