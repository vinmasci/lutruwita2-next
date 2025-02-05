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
          minWidth: '400px',
          borderRadius: '8px'
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        fontSize: '1.5rem',
        fontWeight: 500
      }}>
        Load Route
      </DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        {routes.length === 0 ? (
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            No saved routes found
          </Typography>
        ) : (
          <List>
            {routes.map((route) => (
              <ListItem
                key={route.id}
                component="div"
                onClick={() => onLoad(route.id)}
                sx={{
                  width: '100%',
                  py: 1.5,
                  px: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderRadius: '4px',
                  mb: 0.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  },
                  '&:active': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)'
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Typography sx={{
                      color: 'white',
                      fontSize: '1rem',
                      fontWeight: 500,
                      mb: 0.5
                    }}>
                      {route.name}
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      component="span" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <span>Type: {route.type}</span>
                      {route.isPublic && (
                        <>
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>•</span>
                          <span>Public</span>
                        </>
                      )}
                    </Typography>
                  }
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
                          color: '#f44336',
                          backgroundColor: 'rgba(244, 67, 54, 0.1)'
                        },
                        transition: 'all 0.2s'
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
