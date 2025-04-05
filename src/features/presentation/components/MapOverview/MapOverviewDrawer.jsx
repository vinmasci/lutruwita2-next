import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { EditableMapOverviewPanel } from './EditableMapOverviewPanel';

const MapOverviewDrawer = ({ onClose }) => {
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'rgb(35, 35, 35)',
      color: 'white'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        alignItems: 'center', 
        p: 1
      }}>
        {onClose && (
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <EditableMapOverviewPanel />
      </Box>
    </Box>
  );
};

export default MapOverviewDrawer;
