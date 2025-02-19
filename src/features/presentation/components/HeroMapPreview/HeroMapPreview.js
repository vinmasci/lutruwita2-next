import { jsx as _jsx } from "react/jsx-runtime";
import { MapPreview } from '../MapPreview/MapPreview';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
const MapPreviewWrapper = styled(Box)({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)', // Darker overlay
    }
});
export const HeroMapPreview = ({ center, zoom, routes }) => {
    return (_jsx(MapPreviewWrapper, { children: _jsx(MapPreview, { center: center, zoom: zoom + 2, routes: routes, className: "h-full w-full" }) }));
};
