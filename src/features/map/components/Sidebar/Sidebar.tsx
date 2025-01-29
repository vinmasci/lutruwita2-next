import { useMemo, lazy, Suspense } from 'react';
import { ProcessedRoute } from '../../../gpx/types/gpx.types';
import { NestedDrawer, StyledDrawer } from './Sidebar.styles';
import { SidebarListItems } from './SidebarListItems';
import { SidebarProps } from './types';
import { useSidebar } from './useSidebar';
import { styled } from '@mui/material/styles';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const StyledUploadBox = styled(Paper)(({ theme }) => ({
  width: 264,
  height: 200,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: 'rgba(35, 35, 35, 0.9)',
  border: '2px dashed rgba(255, 255, 255, 0.2)',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: 'rgba(45, 45, 45, 0.9)',
    border: '2px dashed rgba(255, 255, 255, 0.3)',
  },
  '&.dragover': {
    backgroundColor: 'rgba(55, 55, 55, 0.9)',
    border: '2px dashed rgba(255, 255, 255, 0.5)',
    transform: 'scale(0.98)',
  }
}));

// Lazy load the Uploader component
const LazyUploader = lazy(() => import('../../../gpx/components/Uploader/Uploader'));

export const Sidebar = (props: SidebarProps) => {
  const { isDrawerOpen, activeDrawer, handleUploadGpx, isProcessing, error } = useSidebar(props);

  const handleUploadComplete = async (result: ProcessedRoute) => {
    // Pass the processed route to MapView
    await props.onUploadGpx(undefined, result);
  };

  const activeDrawerContent = useMemo(() => {
    if (activeDrawer === 'gpx') {
      return (
        <Suspense fallback={
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        }>
          <LazyUploader 
            onUploadComplete={handleUploadComplete}
          />
        </Suspense>
      );
    }
    return null;
  }, [activeDrawer, handleUploadComplete]);

  return (
    <>
      <StyledDrawer variant="permanent">
        <SidebarListItems 
          {...props}
          onUploadGpx={() => handleUploadGpx()}
        />
      </StyledDrawer>
      
      <NestedDrawer
        variant="persistent"
        anchor="left"
        open={isDrawerOpen}
        onClose={() => handleUploadGpx()}
      >
        {activeDrawerContent}
      </NestedDrawer>
    </>
  );
};
