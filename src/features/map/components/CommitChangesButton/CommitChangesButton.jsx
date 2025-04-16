import React from 'react';
import { Fab, CircularProgress, Tooltip, Badge } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

/**
 * A floating button that appears when changes are detected and allows users to commit them
 * 
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether the button should be visible
 * @param {boolean} props.isUploading - Whether an upload is in progress
 * @param {number} props.uploadProgress - Upload progress (0-100)
 * @param {Function} props.onClick - Function to call when the button is clicked
 * @param {number} props.changeCount - Number of changes to commit
 * @param {string} props.position - Position of the button ('bottom-right', 'bottom-left', 'top-right', 'top-left')
 */
const CommitChangesButton = ({ 
  isVisible, 
  isUploading, 
  uploadProgress = 0, 
  onClick,
  changeCount = 0,
  position = 'bottom-right'
}) => {
  if (!isVisible) return null;
  
  // Calculate position based on the position prop
  const positionStyles = {
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'top-left': { top: 16, left: 16 }
  };
  
  const positionStyle = positionStyles[position] || positionStyles['bottom-right'];
  
  // Determine button color based on change count
  const getButtonColor = () => {
    if (changeCount < 20) {
      return {
        backgroundColor: '#2ecc71', // Green for < 20 changes
        hoverColor: '#27ae60'
      };
    } else if (changeCount < 50) {
      return {
        backgroundColor: '#f39c12', // Yellow/amber for 20-50 changes
        hoverColor: '#e67e22'
      };
    } else {
      return {
        backgroundColor: '#e74c3c', // Red for 50+ changes
        hoverColor: '#c0392b'
      };
    }
  };
  
  const buttonColor = getButtonColor();
  
  return (
    <Tooltip title={`Commit ${changeCount} ${changeCount === 1 ? 'change' : 'changes'}`}>
      <Badge 
        badgeContent={changeCount} 
        color="error"
        overlap="circular"
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ 
          position: 'absolute', 
          ...positionStyle, 
          zIndex: 1000,
          '& .MuiBadge-badge': {
            fontSize: '0.9rem',
            fontWeight: 'bold',
            minWidth: '22px',
            height: '22px',
            padding: '0 6px',
            transform: 'translate(50%, -50%)',
            zIndex: 1500, // Higher z-index to ensure it appears on top of the button
          }
        }}
      >
        <Fab
          color="primary"
          aria-label="commit changes"
          onClick={onClick}
          disabled={isUploading}
          sx={{
            backgroundColor: buttonColor.backgroundColor,
            '&:hover': {
              backgroundColor: buttonColor.hoverColor
            },
            zIndex: 1000 // Ensure button has a lower z-index than the badge
          }}
        >
          {isUploading ? (
            <CircularProgress 
              size={24} 
              variant="determinate" 
              value={uploadProgress} 
              sx={{ color: 'white' }}
            />
          ) : (
            <SaveIcon />
          )}
        </Fab>
      </Badge>
    </Tooltip>
  );
};

export default CommitChangesButton;
