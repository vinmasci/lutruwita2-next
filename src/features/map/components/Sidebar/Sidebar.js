import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, lazy, Suspense } from 'react';
import { usePhotoContext } from '../../../photo/context/PhotoContext';
import { NestedDrawer, StyledDrawer } from './Sidebar.styles';
import { SidebarListItems } from './SidebarListItems';
import { useSidebar } from './useSidebar';
import { Box, CircularProgress } from '@mui/material';
import { Auth0Login } from '../../../auth/components/Auth0Login/Auth0Login';
import { POIDrawer } from '../../../poi/components/POIDrawer';
import { POIDetailsModal } from '../../../poi/components/POIDetailsModal';
import { normalizeRoute } from '../../utils/routeUtils';
import { TextboxTabsDrawer } from '../../../presentation/components/TextboxTabs';
import { useTextboxTabs } from '../../../presentation/context/TextboxTabsContext';
// Lazy load components
const LazyUploader = lazy(() => import('../../../gpx/components/Uploader/Uploader'));
const LazyPhotoUploader = lazy(() => import('../../../photo/components/Uploader/PhotoUploader'));
export const Sidebar = (props) => {
    const { isDrawerOpen, activeDrawer, handleUploadGpx, handleAddPOI, handleAddPhotos, handleTextboxTabs } = useSidebar(props);
    const { addPhoto, deletePhoto } = usePhotoContext();
    const { isDrawerOpen: isTextboxTabsDrawerOpen } = useTextboxTabs();
    const handleUploadComplete = async (result) => {
        // Normalize the route before passing it to MapView
        const normalizedRoute = normalizeRoute(result);
        // Pass the processed route to MapView
        await props.onUploadGpx(undefined, normalizedRoute);
    };
    const activeDrawerContent = useMemo(() => {
        switch (activeDrawer) {
            case 'gpx':
                return (_jsx(Suspense, { fallback: _jsx(Box, { sx: { p: 2, display: 'flex', justifyContent: 'center' }, children: _jsx(CircularProgress, {}) }), children: _jsx(LazyUploader, { onUploadComplete: handleUploadComplete, onDeleteRoute: props.onDeleteRoute }) }));
            case 'photos':
                return (_jsx(Suspense, { fallback: _jsx(Box, { sx: { p: 2, display: 'flex', justifyContent: 'center' }, children: _jsx(CircularProgress, {}) }), children: _jsx(LazyPhotoUploader, { onUploadComplete: addPhoto, onDeletePhoto: deletePhoto }) }));
            case 'poi':
                return null; // POI drawer is handled by NestedDrawer
            default:
                return null;
        }
    }, [activeDrawer, handleUploadComplete, handleAddPOI, props.onDeleteRoute]);
    return (_jsxs(_Fragment, { children: [_jsx(StyledDrawer, { variant: "permanent", children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx(SidebarListItems, { ...props, onUploadGpx: () => handleUploadGpx(), onAddPOI: () => handleAddPOI(), onAddPhotos: () => handleAddPhotos() }), _jsx(Auth0Login, {})] }) }), _jsxs(_Fragment, { children: [_jsx(NestedDrawer, { 
                        variant: "persistent", 
                        anchor: "left", 
                        open: isDrawerOpen, 
                        onClose: () => {
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
                        },
                        sx: {
                            '& .MuiDrawer-paper': {
                                top: '64px', // Position below the header
                                height: 'calc(100% - 64px)', // Adjust height to account for header
                                marginLeft: '56px', // Account for the sidebar width
                                paddingTop: '0px' // Remove any top padding
                            }
                        },
                        children: activeDrawer === 'poi' ? (_jsx(POIDrawer, { isOpen: isDrawerOpen, onClose: () => handleAddPOI() })) : (activeDrawerContent) }), 
                        
                        props.poiDetailsDrawer?.isOpen && (
                            _jsx(POIDetailsModal, { 
                                isOpen: props.poiDetailsDrawer.isOpen, 
                                onClose: props.poiDetailsDrawer.onClose, 
                                iconName: props.poiDetailsDrawer.iconName, 
                                category: props.poiDetailsDrawer.category, 
                                onSave: props.poiDetailsDrawer.onSave,
                                readOnly: props.mode === 'presentation' || props.mode === 'embed'
                            })
                        ),
                        
                        // Add TextboxTabsDrawer with proper props
                        _jsx(TextboxTabsDrawer, { 
                            isOpen: isTextboxTabsDrawerOpen, 
                            onClose: handleTextboxTabs 
                        })
                        ] })] }));
};
