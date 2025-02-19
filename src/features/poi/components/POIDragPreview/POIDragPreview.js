import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { ICON_PATHS } from '../../constants/icon-paths';
import { POI_CATEGORIES } from '../../types/poi.types';
import { getIconDefinition } from '../../constants/poi-icons';
import '../MapboxPOIMarker/MapboxPOIMarker.styles.css';
const POIDragPreview = ({ icon, category, onPlace, }) => {
    const { map } = useMapContext();
    const markerRef = useRef(null);
    const isDraggingRef = useRef(false);
    useEffect(() => {
        if (!map || !markerRef.current)
            return;
        // Add class to body when dragging starts
        document.body.classList.add('poi-dragging');
        const handleMouseMove = (e) => {
            if (!isDraggingRef.current || !markerRef.current)
                return;
            // Follow the cursor
            markerRef.current.style.left = `${e.clientX}px`;
            markerRef.current.style.top = `${e.clientY}px`;
        };
        const handleMouseUp = (e) => {
            if (!isDraggingRef.current)
                return;
            isDraggingRef.current = false;
            // Convert screen coordinates to map coordinates
            const point = map.unproject([e.clientX, e.clientY]);
            onPlace([point.lng, point.lat]);
            // Clean up
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (markerRef.current) {
                markerRef.current.style.display = 'none';
            }
        };
        // Start dragging
        isDraggingRef.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('poi-dragging');
        };
    }, [map, onPlace]);
    return (_jsx("div", { ref: markerRef, style: {
            position: 'fixed',
            zIndex: 1000,
            pointerEvents: 'none',
            transform: 'scale(0.74)', // Scale down to match drawer size (20px/27px)
        }, children: _jsx("div", { className: "marker-container", children: (() => {
                const iconDefinition = getIconDefinition(icon);
                const markerColor = iconDefinition?.style?.color || POI_CATEGORIES[category].color;
                return (_jsxs(_Fragment, { children: [_jsx("div", { className: "marker-bubble", style: { backgroundColor: markerColor }, children: _jsx("i", { className: `${ICON_PATHS[icon]} marker-icon`, style: { color: 'white' } }) }), _jsx("div", { className: "marker-point", style: { borderTopColor: markerColor } })] }));
            })() }) }));
};
export default POIDragPreview;
