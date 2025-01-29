import { useRouteContext } from '../../context/RouteContext';
import { List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { styled } from '@mui/material/styles';

const StyledListItem = styled(ListItem)(({ theme }) => ({
  backgroundColor: 'rgba(35, 35, 35, 0.9)',
  marginBottom: '8px',
  borderRadius: '4px',
  '&:hover': {
    backgroundColor: 'rgba(45, 45, 45, 0.9)',
  },
  '&.selected': {
    backgroundColor: 'rgba(55, 55, 55, 0.9)',
  }
}));

interface RouteListProps {
  onDeleteRoute: (routeId: string) => void;
}

export const RouteList = ({ onDeleteRoute }: RouteListProps) => {
  const { routes, currentRoute, setCurrentRoute } = useRouteContext();

  const handleRouteClick = (route: typeof routes[0]) => {
    setCurrentRoute(route);
  };

  const handleDeleteClick = (e: React.MouseEvent, routeId: string) => {
    e.stopPropagation(); // Prevent route selection when deleting
    onDeleteRoute(routeId);
  };

  return (
    <List sx={{ width: '100%', padding: 2 }}>
      {routes.map((route) => (
        <StyledListItem
          key={route.id} // Use id as it's guaranteed to exist
          onClick={() => handleRouteClick(route)}
          className={currentRoute?.routeId === route.routeId ? 'selected' : ''}
          sx={{ cursor: 'pointer' }}
        >
          <ListItemText 
            primary={route.name}
            secondary={`${(route.statistics.totalDistance / 1000).toFixed(1)}km`}
            sx={{ color: 'white' }}
          />
          <ListItemSecondaryAction>
            <IconButton
              edge="end"
              aria-label="delete"
              onClick={(e) => route.routeId && handleDeleteClick(e, route.routeId)}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <DeleteIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </StyledListItem>
      ))}
    </List>
  );
};
