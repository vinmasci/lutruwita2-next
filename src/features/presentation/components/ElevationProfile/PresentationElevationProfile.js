import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { detectClimbs } from '../../../gpx/utils/climbUtils';
const ElevationContent = styled('div')({
    width: '100%',
    height: '220px',
    padding: 0,
    backgroundColor: '#1a1a1a',
    '& .recharts-cartesian-grid-horizontal line, & .recharts-cartesian-grid-vertical line': {
        stroke: 'rgba(255, 255, 255, 0.05)'
    },
    '& .recharts-text': {
        fill: 'rgba(255, 255, 255, 0.7)'
    },
    '& .recharts-tooltip-wrapper': {
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '4px',
        '& .recharts-default-tooltip': {
            background: 'linear-gradient(135deg, rgba(238, 82, 83, 0.15) 0%, rgba(30, 30, 30, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            padding: '6px 8px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            '& .recharts-tooltip-label': {
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '0.75rem',
                fontFamily: 'Futura, sans-serif',
                marginBottom: '2px'
            },
            '& .recharts-tooltip-item': {
                color: 'rgba(255, 255, 255, 0.95)',
                fontSize: '0.75rem',
                fontFamily: 'Futura, sans-serif',
                padding: '1px 0'
            },
            '& .recharts-tooltip-item-name': {
                color: 'rgba(255, 255, 255, 0.7)'
            }
        }
    },
    '& .recharts-area-area': {
        fill: '#4b6584'
    },
    '& .recharts-area-curve': {
        stroke: '#4b6584',
        strokeWidth: 2
    }
});
export const PresentationElevationProfile = ({ route, isLoading, error }) => {
    const [data, setData] = useState([]);
    const [climbs, setClimbs] = useState([]);
    const [stats, setStats] = useState({ elevationGained: 0, elevationLost: 0, totalDistance: 0 });
    useEffect(() => {
        if (!route?.geojson?.features?.[0]?.properties?.coordinateProperties?.elevation) {
            setData([]);
            return;
        }
        try {
            const feature = route.geojson.features[0];
            if (feature.geometry.type !== 'LineString') {
                setData([]);
                return;
            }
            const elevations = feature.properties?.coordinateProperties?.elevation;
            const totalDistance = route.statistics.totalDistance;
            if (!Array.isArray(elevations)) {
                setData([]);
                return;
            }
            // Calculate the distance between each point as a fraction of total distance
            const elevationData = elevations.map((elev, index) => {
                const distance = (index / (elevations.length - 1)) * totalDistance;
                return {
                    distance,
                    elevation: elev
                };
            });
            // Calculate elevation stats
            let elevationGained = 0;
            let elevationLost = 0;
            for (let i = 1; i < elevationData.length; i++) {
                const elevDiff = elevationData[i].elevation - elevationData[i - 1].elevation;
                if (elevDiff > 0) {
                    elevationGained += elevDiff;
                }
                else {
                    elevationLost += Math.abs(elevDiff);
                }
            }
            setStats({
                elevationGained,
                elevationLost,
                totalDistance
            });
            setData(elevationData);
            // Detect climbs and store them
            const detectedClimbs = detectClimbs(elevationData);
            setClimbs(detectedClimbs);
        }
        catch (err) {
            console.error('Error processing elevation data:', err);
            setData([]);
        }
    }, [route]);
    if (error) {
        return (_jsxs(ElevationContent, { className: "flex items-center justify-center text-red-500", children: ["Error loading elevation data: ", error] }));
    }
    if (isLoading) {
        return (_jsx(ElevationContent, { className: "flex items-center justify-center text-muted-foreground", children: "Loading elevation data..." }));
    }
    if (!data.length) {
        return (_jsx(ElevationContent, { className: "flex items-center justify-center text-muted-foreground", children: "No elevation data available" }));
    }
    return (_jsx("div", { className: "elevation-profile", children: _jsxs(ElevationContent, { children: [_jsxs(Box, { sx: { px: 2, py: 1, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }, children: [_jsxs(Typography, { variant: "subtitle2", color: "white", sx: { fontSize: '0.8rem', fontWeight: 500, mr: 3, fontFamily: 'Futura' }, children: ["Elevation Profile: ", route.name] }), _jsxs(Box, { sx: { display: 'flex', gap: 3, ml: 'auto' }, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { fontSize: '0.75rem', fontFamily: 'Futura' }, children: [(stats.totalDistance / 1000).toFixed(1), " km"] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { fontSize: '0.75rem', fontFamily: 'Futura' }, children: ["\u2191 ", stats.elevationGained.toFixed(0), " m"] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { fontSize: '0.75rem', fontFamily: 'Futura' }, children: ["\u2193 ", stats.elevationLost.toFixed(0), " m"] }), _jsxs(Box, { sx: { display: 'flex', gap: 2, borderLeft: '1px solid rgba(255, 255, 255, 0.1)', pl: 2, ml: 2 }, children: [_jsx(Typography, { variant: "body2", sx: { fontSize: '0.75rem', fontFamily: 'Futura', color: '#8B0000' }, children: "HC" }), _jsx(Typography, { variant: "body2", sx: { fontSize: '0.75rem', fontFamily: 'Futura', color: '#FF0000' }, children: "CAT1" }), _jsx(Typography, { variant: "body2", sx: { fontSize: '0.75rem', fontFamily: 'Futura', color: '#fa8231' }, children: "CAT2" }), _jsx(Typography, { variant: "body2", sx: { fontSize: '0.75rem', fontFamily: 'Futura', color: '#f7b731' }, children: "CAT3" }), _jsx(Typography, { variant: "body2", sx: { fontSize: '0.75rem', fontFamily: 'Futura', color: '#228B22' }, children: "CAT4" })] })] })] }), _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: data, margin: { top: 30, right: 15, left: 5, bottom: 55 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "distance", label: {
                                    value: 'Distance (km)',
                                    position: 'bottom',
                                    dy: -10,
                                    style: { fontSize: '0.7rem', fontFamily: 'Futura' }
                                }, tickFormatter: (value) => `${(value / 1000).toFixed(0)}`, domain: [0, 'dataMax'], type: "number", scale: "linear", allowDataOverflow: false, tick: { fontSize: '0.45rem', fontFamily: 'Futura' }, tickSize: 3 }), _jsx(YAxis, { label: {
                                    value: 'Elevation (m)',
                                    angle: -90,
                                    position: 'left',
                                    dx: 20,
                                    style: { fontSize: '0.7rem', fontFamily: 'Futura' }
                                }, tick: { fontSize: '0.55rem', fontFamily: 'Futura' }, tickSize: 3 }), _jsx(Tooltip, { formatter: (value, name, props) => {
                                    const currentIndex = data.findIndex(d => d.distance === props.payload.distance);
                                    if (currentIndex > 0) {
                                        const currentPoint = data[currentIndex];
                                        const prevPoint = data[currentIndex - 1];
                                        const elevationChange = currentPoint.elevation - prevPoint.elevation;
                                        const distanceChange = (currentPoint.distance - prevPoint.distance) / 1000;
                                        const gradient = ((elevationChange / (distanceChange * 1000)) * 100);
                                        return [
                                            _jsxs("div", { children: [_jsxs("div", { style: {
                                                            fontFamily: 'Futura',
                                                            color: 'white',
                                                            display: 'flex',
                                                            gap: '4px'
                                                        }, children: [_jsx("span", { children: "el:" }), _jsxs("span", { children: [value.toFixed(1), " m"] })] }), _jsx("div", { style: {
                                                            color: 'white',
                                                            fontSize: '0.75rem',
                                                            marginTop: '4px',
                                                            fontFamily: 'Futura',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '2px'
                                                        }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.7)' }, children: [gradient > 0 ? '↗' : '↘', " ", Math.abs(gradient).toFixed(1), "%"] }) })] }, "tooltip")
                                        ];
                                    }
                                    return [`${value.toFixed(1)} m`, ''];
                                }, labelFormatter: (label) => `${(label / 1000).toFixed(2)} km`, contentStyle: { background: 'none', border: 'none' }, wrapperStyle: { outline: 'none' } }), climbs.map((climb, index) => (_jsxs(React.Fragment, { children: [_jsx(ReferenceLine, { x: climb.startPoint.distance, stroke: climb.color, strokeWidth: 2, label: ({ viewBox }) => {
                                            const text = `${(climb.totalDistance / 1000).toFixed(1)}km @ ${(climb.averageGradient).toFixed(1)}%`;
                                            const textWidth = text.length * 5.5;
                                            const isNearEnd = climb.startPoint.distance > (data[data.length - 1].distance * 0.75);
                                            const xOffset = isNearEnd ? -(textWidth + 15) : 5;
                                            return (_jsxs("g", { children: [_jsx("filter", { id: `shadow-${index}`, x: "-20%", y: "-20%", width: "140%", height: "140%", children: _jsx("feDropShadow", { dx: "0", dy: "1", stdDeviation: "1", floodOpacity: "0.3" }) }), _jsx("rect", { x: viewBox.x + xOffset, y: viewBox.y - 25, width: textWidth, height: "16", rx: "2", fill: climb.color, fillOpacity: 0.9, filter: `url(#shadow-${index})` }), _jsx("text", { x: viewBox.x + xOffset + 5, y: viewBox.y - 13, fill: "#fff", fontSize: 8, fontFamily: "Futura", children: text })] }));
                                        }, isFront: true }), _jsx(ReferenceLine, { x: climb.endPoint.distance, stroke: climb.color, strokeWidth: 2, strokeDasharray: "4 2", isFront: true })] }, index))), _jsx(Area, { type: "monotone", dataKey: "elevation", stroke: "#4b6584", fill: "rgba(75, 101, 132, 0.2)", strokeWidth: 2 })] }) })] }) }));
};
