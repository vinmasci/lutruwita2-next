# Directory Structure

## Root
.env.local  
ARCHITECTURE.md  
DIR.md  
index.html  
MIGRATION_LOG.md  
package-lock.json  
package.json  
tailwind.config.js  
tsconfig.app.json  
tsconfig.base.json  
tsconfig.client.json  
tsconfig.json  
tsconfig.node.json  
tsconfig.server.json  
tsconfig.tsbuildinfo  

## public/
favicon.ico

## server/
package-lock.json  
package.json  
tsconfig.json  
src/  
uploads/

### server/src/
server.ts  
config/  
middlewares/  
routes/  
services/  
utils/

#### server/src/middlewares/
auth.ts  
error-handling.ts

#### server/src/services/
gpx/  
surface/

## src/
App.tsx  
env.d.ts  
index.css  
main.tsx  
theme.ts  
components/  
features/  
lib/  
types/  
utils/

### src/components/
ui/

#### src/components/ui/
skeleton.tsx

### src/features/
gpx/  
map/  
poi/

#### src/features/gpx/
components/  
hooks/  
routes/  
services/  
types/

##### src/features/gpx/components/
ElevationProfile/  
Uploader/

###### src/features/gpx/components/ElevationProfile/
ElevationProfile.tsx

###### src/features/gpx/components/Uploader/
index.ts  
Uploader.tsx  
Uploader.types.ts  
UploaderUI.tsx

##### src/features/gpx/hooks/
useGpxProcessing.ts

##### src/features/gpx/routes/
gpx.ts

##### src/features/gpx/services/
gpxService.ts

##### src/features/gpx/types/
gpx.types.ts

#### src/features/map/
components/  
context/  
hooks/  
services/  
types/

##### src/features/map/components/
MapControls/  
MapView/  
Sidebar/

###### src/features/map/components/MapControls/
MapControls.tsx

###### src/features/map/components/MapView/
MapView.tsx

###### src/features/map/components/Sidebar/
icons.ts  
index.ts  
Sidebar.styles.ts  
Sidebar.tsx  
SidebarListItems.tsx  
types.ts  
useSidebar.ts

##### src/features/map/context/
MapContext.tsx

##### src/features/map/hooks/
useGpxProcessing.ts  
useMap.ts

##### src/features/map/services/
mapService.ts

##### src/features/map/types/
map.types.ts

#### src/features/poi/
components/

##### src/features/poi/components/
POIMarker/

###### src/features/poi/components/POIMarker/
index.ts

### src/lib/
errors.ts  
utils.ts

### src/types/
api.types.ts  
index.ts

### src/utils/
gpx/

#### src/utils/gpx/
parsing.ts
