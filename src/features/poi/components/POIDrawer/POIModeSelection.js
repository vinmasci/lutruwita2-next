import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Typography } from '@mui/material';
import { MapPin, MapPinned } from 'lucide-react';
import { ModeSelectionCard } from './POIDrawer.styles';
const POIModeSelection = ({ onModeSelect }) => {
    return (_jsxs(_Fragment, { children: [
        _jsx(Typography, { variant: "h6", gutterBottom: true, sx: { width: '100%', wordWrap: 'break-word' }, children: "Add Point of Interest" }), 
        _jsx(ModeSelectionCard, { onClick: () => onModeSelect('regular'), children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%', overflow: 'hidden' }, children: [_jsx(MapPin, { size: 24 }), _jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [_jsx(Typography, { variant: "subtitle1", sx: { wordWrap: 'break-word' }, children: "Add POI to Map" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { wordWrap: 'break-word' }, children: "Click anywhere on the map to place a POI" })] })] }) }),
        // Place POI functionality is commented out
        /*
        _jsx(ModeSelectionCard, { onClick: () => onModeSelect('place'), children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx(MapPinned, { size: 24 }), _jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [_jsx(Typography, { variant: "subtitle1", sx: { wordWrap: 'break-word' }, children: "Add POI to Place" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { wordWrap: 'break-word' }, children: "Click a place name to attach POIs" })] })] }) }),
        */
        _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 2, width: '100%', wordWrap: 'break-word' }, children: "Drag and drop a point of interest onto the map." })
    ] }));
};
export default POIModeSelection;
