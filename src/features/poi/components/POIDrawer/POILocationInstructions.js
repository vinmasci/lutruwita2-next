import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button, Typography } from '@mui/material';
import { MousePointer2, MapPin } from 'lucide-react';
import { InstructionsBox, InstructionsText } from './POIDrawer.styles';
import { usePOIContext } from '../../context/POIContext';
const POILocationInstructions = ({ mode, onCancel }) => {
    // Ensure mode is not 'none'
    if (mode === 'none')
        return null;
    const { poiMode } = usePOIContext();
    const instructions = {
        regular: {
            title: 'Select Location',
            icon: _jsx(MousePointer2, { size: 24 }),
            steps: [
                'Click anywhere on the map to place your POI',
                'The cursor will change to a crosshair',
                'Click to confirm the location'
            ]
        },
        place: {
            title: 'Select Place',
            icon: _jsx(MapPin, { size: 24 }),
            steps: [
                'Find a place name on the map',
                'Click the place name text',
                'The POI will be attached to the selected place'
            ]
        }
    };
    const currentInstructions = instructions[mode];
    return (_jsxs(_Fragment, { children: [_jsxs(Typography, { variant: "h6", gutterBottom: true, sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [currentInstructions.icon, currentInstructions.title] }), _jsx(InstructionsBox, { children: currentInstructions.steps.map((step, index) => (_jsxs(InstructionsText, { variant: "body2", children: [index + 1, ". ", step] }, index))) }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 2 }, children: mode === 'regular'
                    ? poiMode === 'regular'
                        ? 'Click anywhere on the map to place your point of interest.'
                        : 'Choose a precise location on the map for your point of interest.'
                    : 'Select a place name to attach one or more points of interest.' }), _jsx(Button, { variant: "text", color: "inherit", onClick: onCancel, fullWidth: true, children: "Cancel Selection" })] }));
};
export default POILocationInstructions;
