import { List, ListItem, ListItemButton, ListItemIcon, Tooltip } from '@mui/material';
import { SidebarIcons } from './icons';
import { SidebarProps } from './types';

export const SidebarListItems = ({
  onUploadGpx,
  onSaveMap,
  onLoadMap,
  onAddPhotos,
  onAddPOI,
  onItemClick,
  mapReady
}: SidebarProps) => {

  const items = [
    {
      icon: SidebarIcons.actions.gpx,
      text: 'Add GPX',
      onClick: () => {
        onItemClick('gpx');
        onUploadGpx();
      }
    },
    {
      icon: SidebarIcons.actions.save,
      text: 'Save GPX',
      onClick: onSaveMap
    },
    {
      icon: SidebarIcons.actions.load,
      text: 'Load GPX',
      onClick: onLoadMap
    },
    {
      icon: SidebarIcons.actions.photos,
      text: 'Add Photos',
      onClick: onAddPhotos
    },
    {
      icon: SidebarIcons.actions.poi,
      text: 'Add POI',
      onClick: onAddPOI
    }
  ];

  return (
    <List>
      {items.map((item) => (
        <Tooltip key={item.text} title={item.text} placement="right">
          <ListItem disablePadding>
            <ListItemButton onClick={item.onClick}>
              <ListItemIcon>
                <item.icon strokeWidth={1.5} />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        </Tooltip>
      ))}
      
    </List>
  );
};
