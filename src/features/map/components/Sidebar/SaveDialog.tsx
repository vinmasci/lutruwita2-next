import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch
} from '@mui/material';

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (formData: {
    name: string;
    type: 'tourism' | 'event' | 'bikepacking' | 'single';
    isPublic: boolean;
  }) => void;
  initialValues?: {
    name: string;
    type: 'tourism' | 'event' | 'bikepacking' | 'single';
    isPublic: boolean;
  };
  isEditing?: boolean;
}

export const SaveDialog = ({ open, onClose, onSave, initialValues, isEditing }: SaveDialogProps) => {
  const [formData, setFormData] = useState({
    name: initialValues?.name || '',
    type: initialValues?.type || 'tourism' as const,
    isPublic: initialValues?.isPublic || false
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialValues?.name || '',
        type: initialValues?.type || 'tourism',
        isPublic: initialValues?.isPublic || false
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
              type: e.target.value as typeof formData.type 
            }))}
          >
            <MenuItem value="tourism">Tourism</MenuItem>
            <MenuItem value="event">Event</MenuItem>
            <MenuItem value="bikepacking">Bikepacking</MenuItem>
            <MenuItem value="single">Single</MenuItem>
          </Select>
        </FormControl>
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
        >
          Cancel
        </Button>
        <Button 
          onClick={() => onSave(formData)}
          disabled={!formData.name}
          sx={{ 
            color: formData.name ? '#90caf9' : 'rgba(255, 255, 255, 0.3)'
          }}
        >
          {isEditing ? 'Update' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
