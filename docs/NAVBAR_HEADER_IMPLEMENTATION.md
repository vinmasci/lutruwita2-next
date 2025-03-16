# Navbar Header Implementation

## Overview

This document outlines the implementation of a navbar header across all map view modes (creation, presentation, and embed) in the Lutruwita2 application. The navbar header displays the title of the route file and can be customized with colors and logos in creation mode, with these customizations persisting in presentation and embed modes.

## Requirements

1. Add a navbar header to all map view modes:
   - Creation mode
   - Presentation mode
   - Embed mode
2. Display the route title in the header instead of floating over the map
3. Allow customization of the header in creation mode:
   - Change the background color
   - Add a logo
4. Persist customizations in presentation and embed modes

## Implementation Details

### 1. MapHeader Component

The `MapHeader` component is used across all map view modes to provide a consistent header experience. It accepts the following props:

- `title`: The title of the route to display
- `color`: The background color of the header (defaults to dark gray)
- `logoUrl`: Optional URL for a logo image

```jsx
// src/features/map/components/MapHeader/MapHeader.js
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AppBar, Toolbar, Typography, Box } from '@mui/material';

const MapHeader = ({ title, color = 'rgba(35, 35, 35, 0.9)', logoUrl }) => {
    return (_jsx(AppBar, { 
        position: "relative",
        sx: {
            backgroundColor: color || '#333333',
            boxShadow: 3,
            zIndex: 1000,
            height: '64px',
            minHeight: '64px',
            maxHeight: '64px',
            width: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
        }, 
        children: 
            _jsx(Toolbar, { 
                sx: { 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    minHeight: '64px',
                    height: '64px',
                    padding: '0 16px'
                }, 
                children: 
                    _jsxs(Box, { 
                        sx: { 
                            display: 'flex', 
                            alignItems: 'center' 
                        }, 
                        children: [
                            logoUrl && (_jsx(Box, { 
                                component: "img", 
                                src: logoUrl, 
                                alt: "Logo", 
                                sx: {
                                    height: 40,
                                    marginRight: 2,
                                    maxWidth: 120,
                                    objectFit: 'contain'
                                } 
                            })),
                            _jsx(Typography, { 
                                variant: "h6", 
                                component: "div", 
                                sx: {
                                    flexGrow: 1,
                                    fontFamily: 'Fraunces, serif',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                                }, 
                                children: title || 'Untitled Route' 
                            })
                        ]
                    })
            })
    }));
};

export default MapHeader;
```

### 2. HeaderCustomization Component

The `HeaderCustomization` component allows users to customize the header in creation mode:

- Change the background color using a color picker
- Upload a logo image

### 3. Integration in Map Views

#### Creation Mode (MapView)

In creation mode, the `MapHeader` component is rendered at the top of the map view, and the `HeaderCustomization` component is positioned in the top-right corner to allow for customization.

```jsx
// src/features/map/components/MapView/MapView.js
_jsx(MapHeader, { 
    title: currentRoute?._loadedState?.name || currentRoute?.name || 'Untitled Route',
    color: headerSettings.color,
    logoUrl: headerSettings.logoUrl
}),

// HeaderCustomization component
isMapReady && (_jsx("div", { className: "header-customization-container", style: { position: 'absolute', top: '70px', right: '10px', zIndex: 1000 }, children:
    _jsx(HeaderCustomization, {
        color: headerSettings.color,
        logoUrl: headerSettings.logoUrl,
        onSave: updateHeaderSettings
    })
})),
```

#### Presentation Mode (PresentationMapView)

In presentation mode, the `MapHeader` component is rendered with the customized settings from creation mode:

```jsx
// src/features/presentation/components/PresentationMapView/PresentationMapView.js
_jsx(MapHeader, { 
    title: currentRoute?._loadedState?.name || currentRoute?.name || 'Untitled Route',
    color: headerSettings?.color || '#333333',
    logoUrl: headerSettings?.logoUrl
}),
```

#### Embed Mode (EmbedMapView)

In embed mode, the `MapHeader` component is also rendered with the customized settings:

```jsx
// src/features/presentation/components/EmbedMapView/EmbedMapView.jsx
<MapHeader 
    title={currentRoute?.name || 'Untitled Route'}
    color={routeData?.headerSettings?.color || '#333333'}
    logoUrl={routeData?.headerSettings?.logoUrl}
/>
```

### 4. Drawer Positioning

To ensure proper positioning of all drawers below the navbar header, we updated the drawer components in all map view modes:

#### Sidebar.js

```jsx
<NestedDrawer
    variant="persistent"
    anchor="left"
    open={isDrawerOpen}
    sx={{
        '& .MuiDrawer-paper': {
            top: '64px', // Position below the header
            height: 'calc(100% - 64px)', // Adjust height to account for header
            marginLeft: '56px', // Account for the sidebar width
            paddingTop: '0px' // Remove any top padding
        }
    }}
>
    {/* Drawer content */}
</NestedDrawer>
```

#### PresentationSidebar.js

```jsx
<NestedDrawer
    variant="persistent"
    anchor="left"
    open={isNestedOpen}
    sx={{
        '& .MuiDrawer-paper': {
            top: '64px', // Position below the header
            height: 'calc(100% - 64px)', // Adjust height to account for header
            marginLeft: '56px', // Account for the sidebar width
            paddingTop: '0px' // Remove any top padding
        }
    }}
>
    {/* Drawer content */}
</NestedDrawer>
```

#### EmbedSidebar.jsx

```jsx
<NestedDrawer
    variant="persistent"
    anchor="left"
    open={isNestedOpen}
    sx={{
        '& .MuiDrawer-paper': {
            top: '64px', // Position below the header
            height: 'calc(100% - 64px)', // Adjust height to account for header
            marginLeft: '56px', // Account for the sidebar width
            paddingTop: '0px' // Remove any top padding
        }
    }}
>
    {/* Drawer content */}
</NestedDrawer>
```

## Data Flow

1. In creation mode, users can customize the header using the `HeaderCustomization` component
2. The customization settings are stored in the `RouteContext` as `headerSettings`
3. When saving a route, the header settings are saved along with the route data
4. In presentation and embed modes, the header settings are loaded from the route data and applied to the `MapHeader` component

## Navigation Links Implementation

The header now includes navigation links on the left side, allowing users to quickly navigate between different parts of the application:

1. Home link - navigates to the landing page
2. Map Editor link - navigates to the editor page

These navigation links have the following features:
- Icons are positioned at the left edge of the header
- Active page is indicated by a bolder stroke on the icon
- Icons are sized to match the sidebar icons (24px)
- Tooltips provide additional context on hover

```jsx
// Navigation links implementation in MapHeader.js
const MapHeader = ({ title, color = '#000000', logoUrl, username }) => {
    const location = useLocation();
    const isHome = location.pathname === '/' || location.pathname === '';
    const isEditor = location.pathname === '/editor';
    
    // Bold white for active icon (the page we're currently on)
    const activeStyle = {
        color: 'white',
        stroke: 'white',
        strokeWidth: '0.5px',
        filter: 'drop-shadow(0px 0px 1px rgba(255, 255, 255, 0.7))'
    };
    
    return (
        // ... header container ...
        <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '1px',
            position: 'absolute',
            left: '-1px'
        }}>
            <Tooltip title="Home">
                <IconButton
                    component={Link}
                    to="/"
                    sx={{
                        ...(isHome ? activeStyle : { color: 'white' }),
                        padding: '8px 8px 8px 0px',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                    }}
                >
                    <Home size={24} />
                </IconButton>
            </Tooltip>
            <Tooltip title="Map Editor">
                <IconButton
                    component={Link}
                    to="/editor"
                    sx={{
                        ...(isEditor ? activeStyle : { color: 'white' }),
                        padding: '8px',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                    }}
                >
                    <Map size={24} />
                </IconButton>
            </Tooltip>
        </Box>
        // ... rest of header ...
    );
};
```

## Username Attribution

The header now supports displaying the creator's username as an attribution:

1. Username is displayed on the right side of the header
2. Format: "by [username]"
3. Username takes precedence over logo (if both are provided, username is shown)

```jsx
// Username attribution implementation in MapHeader.js
<Box sx={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'absolute',
    right: '16px'
}}>
    {username && !logoUrl && (
        <Typography
            variant="body2"
            sx={{
                color: '#ffffff',
                opacity: 0.9,
                fontStyle: 'italic'
            }}
        >
            by {username}
        </Typography>
    )}
    {logoUrl && (
        <Box
            component="img"
            src={logoUrl}
            alt="Logo"
            sx={{
                height: 40,
                maxWidth: 120,
                objectFit: 'contain'
            }}
        />
    )}
</Box>
```

## Future Improvements

1. Add more customization options for the header:
   - Font customization
   - Text color customization
   - Header height adjustment
2. Allow for different header styles/templates
3. Add the ability to include additional information in the header, such as route statistics
4. Add more navigation links as needed for new features
5. Implement responsive design for the header on smaller screens
