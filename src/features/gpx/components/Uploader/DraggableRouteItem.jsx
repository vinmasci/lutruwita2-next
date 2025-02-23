import React from 'react';
import PropTypes from 'prop-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Box } from '@mui/material';

export const DraggableRouteItem = ({ route, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: route.routeId || route.id,
    data: {
      type: 'route',
      route,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    touchAction: 'none',
    cursor: isDragging ? 'grabbing' : 'default',
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Box
        {...attributes}
        {...listeners}
        sx={{
          position: 'absolute',
          right: '8px', // Position on the far right
          top: '32px', // Position on second row
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          opacity: 0.7,
          padding: '4px',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          '&:hover': {
            opacity: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          '&:active': {
            cursor: 'grabbing',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
          },
          touchAction: 'none',
          userSelect: 'none',
          zIndex: 1
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
      {children}
    </Box>
  );
};

DraggableRouteItem.propTypes = {
  route: PropTypes.shape({
    routeId: PropTypes.string,
    id: PropTypes.string,
    name: PropTypes.string,
    color: PropTypes.string,
  }).isRequired,
  children: PropTypes.node.isRequired,
};
