import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { RouteListItem } from '../../types/route.types';

interface LoadDialogProps {
  open: boolean;
  onClose: () => void;
  routes: RouteListItem[];
  onLoad: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const LoadDialog = ({ 
  open, 
  onClose, 
  routes, 
  onLoad,
  onDelete 
}: LoadDialogProps) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: { 
          backgroundColor: 'rgb(35, 35, 35)',
          color: 'white',
          minWidth: '400px'
        }
      }}
    >
      <DialogTitle>Load Route</DialogTitle>
      <DialogContent>
        {routes.length === 0 ? (
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            No saved routes found
          </Typography>
        ) : (
          <List>
            {routes.map((route) => (
              <ListItem
                key={route.id}
                component="button"
                onClick={() => onLoad(route.id)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <ListItemText
                  primary={route.name}
                  secondary={
                    <Typography 
                      component="span" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.875rem'
                      }}
                    >
                      Type: {route.type}
                      {route.isPublic && ' • Public'}
                    </Typography>
                  }
                  sx={{
                    '& .MuiListItemText-primary': {
                      color: 'white'
                    }
                  }}
                />
                {onDelete && (
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(route.id);
                      }}
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                          color: '#f44336'
                        }
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};
