import { useMemo } from 'react';
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

const GPXUploader = ({ onUpload, isLoading, error }: { onUpload: (file: File) => void, isLoading?: boolean, error?: string }) => {
  return (
    <Box sx={{ p: 2 }}>
      <StyledUploadBox
        className="upload-box"
        elevation={0}
        onDragOver={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.add('dragover');
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove('dragover');
        }}
        onDrop={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove('dragover');
          const file = e.dataTransfer.files[0];
          if (file && file.name.endsWith('.gpx')) {
            onUpload(file);
          }
        }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.gpx';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              onUpload(file);
            }
          };
          input.click();
        }}
      >
        {isLoading ? (
          <>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body1" sx={{ color: '#fff', fontWeight: 500 }}>
              Processing GPX File...
            </Typography>
          </>
        ) : error ? (
          <>
            <ErrorOutlineIcon sx={{ fontSize: 40, color: '#ff4444', mb: 2 }} />
            <Typography variant="body1" sx={{ color: '#ff4444', fontWeight: 500 }}>
              Upload Failed
            </Typography>
            <Typography variant="caption" sx={{ color: '#ff4444', mt: 1 }}>
              {error}
            </Typography>
          </>
        ) : (
          <>
            <UploadIcon sx={{ fontSize: 40, color: '#fff', mb: 2 }} />
            <Typography variant="body1" sx={{ color: '#fff', fontWeight: 500 }}>
              Upload GPX File
            </Typography>
            <Typography variant="caption" sx={{ color: '#999', mt: 1 }}>
              Click or drag to add route
            </Typography>
          </>
        )}
      </StyledUploadBox>
    </Box>
  );
};

export const Sidebar = (props: SidebarProps) => {
  const { isDrawerOpen, activeDrawer, handleUploadGpx, isProcessing, error } = useSidebar(props);

  const activeDrawerContent = useMemo(() => {
    if (activeDrawer === 'gpx') {
      return <GPXUploader 
        onUpload={props.onUploadGpx} 
        isLoading={isProcessing} 
        error={error || undefined} 
      />;
    }
    return null;
  }, [activeDrawer, props.onUploadGpx, isProcessing, error]);

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
