import { useMemo, lazy, Suspense } from 'react';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { ProcessedRoute as GpxProcessedRoute } from '../../../gpx/types/gpx.types';
import { NestedDrawer, StyledDrawer } from './Sidebar.styles';
import { SidebarListItems } from './SidebarListItems';
import { SidebarProps } from './types';
import { useSidebar } from './useSidebar';
import { styled } from '@mui/material/styles';
import { Box, Paper, CircularProgress } from '@mui/material';
import { Auth0Login } from '../../../auth/components/Auth0Login/Auth0Login';
import { POIDrawer } from '../../../poi/components/POIDrawer';
import POIDetailsDrawer from '../../../poi/components/POIDetailsDrawer/POIDetailsDrawer';
import { POIIconName, POICategory } from '../../../poi/types/poi.types';
import { normalizeRoute } from '../../utils/routeUtils';

// Lazy load components
const LazyUploader = lazy(() => import('../../../gpx/components/Uploader/Uploader'));
const LazyPhotoUploader = lazy(() => import('../../../photo/components/Uploader/PhotoUploader'));

export const Sidebar = (props: SidebarProps) => {
  const { 
    isDrawerOpen, 
    activeDrawer, 
    handleUploadGpx, 
    handleAddPOI,
    handleAddPhotos
  } = useSidebar(props);
  const { addPhoto, deletePhoto } = usePhotoContext();

  const handleUploadComplete = async (result: GpxProcessedRoute) => {
    // Normalize the route before passing it to MapView
    const normalizedRoute = normalizeRoute(result);
    // Pass the processed route to MapView
    await props.onUploadGpx(undefined, normalizedRoute);
  };

  const activeDrawerContent = useMemo(() => {
    switch (activeDrawer) {
      case 'gpx':
        return (
          <Suspense fallback={
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          }>
            <LazyUploader 
              onUploadComplete={handleUploadComplete}
              onDeleteRoute={props.onDeleteRoute}
            />
          </Suspense>
        );
      case 'photos':
        return (
          <Suspense fallback={
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          }>
            <LazyPhotoUploader 
              onUploadComplete={addPhoto}
              onDeletePhoto={deletePhoto}
            />
          </Suspense>
        );
      case 'poi':
        return null; // POI drawer is handled by NestedDrawer
      default:
        return null;
    }
  }, [activeDrawer, handleUploadComplete, handleAddPOI, props.onDeleteRoute]);

  return (
    <>
      <StyledDrawer variant="permanent">
<Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
  <SidebarListItems 
    {...props}
    onUploadGpx={() => handleUploadGpx()}
    onAddPOI={() => handleAddPOI()}
    onAddPhotos={() => handleAddPhotos()}
  />
  <Box sx={{ mt: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
    <Auth0Login />
  </Box>
</Box>
      </StyledDrawer>
      
      <>
        <NestedDrawer
          variant="persistent"
          anchor="left"
          open={isDrawerOpen}
          onClose={() => {
            switch (activeDrawer) {
              case 'gpx':
                handleUploadGpx();
                break;
              case 'poi':
                handleAddPOI();
                break;
              case 'photos':
                handleAddPhotos();
                break;
            }
          }}
        >
          {activeDrawer === 'poi' ? (
            <POIDrawer isOpen={isDrawerOpen} onClose={() => handleAddPOI()} />
          ) : (
            activeDrawerContent
          )}
        </NestedDrawer>

        {props.poiDetailsDrawer?.isOpen && (
          <NestedDrawer
            variant="persistent"
            anchor="left"
            open={props.poiDetailsDrawer.isOpen}
            onClose={props.poiDetailsDrawer.onClose}
            sx={{ zIndex: 1300 }}
          >
            <POIDetailsDrawer
              isOpen={props.poiDetailsDrawer.isOpen}
              onClose={props.poiDetailsDrawer.onClose}
              iconName={props.poiDetailsDrawer.iconName}
              category={props.poiDetailsDrawer.category}
              onSave={props.poiDetailsDrawer.onSave}
            />
          </NestedDrawer>
        )}
      </>
    </>
  );
};
