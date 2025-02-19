import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Typography } from '@mui/material';
import { Info } from 'lucide-react';
export const PlacePOIInstructions = () => (_jsxs("div", { className: "flex flex-col items-center justify-center p-4 text-center", children: [_jsx(Info, { className: "w-12 h-12 mb-4 text-muted-foreground" }), _jsx(Typography, { variant: "h6", className: "mb-2", children: "Hover Over a Place Name" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "Move your cursor over any city, town, or village name on the map to add POIs to that location." })] }));
export default PlacePOIInstructions;
