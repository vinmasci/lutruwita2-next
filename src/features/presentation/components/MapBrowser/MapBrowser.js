import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicRouteService } from '../../services/publicRoute.service';
import { MapPreview } from '../MapPreview/MapPreview';
import mapboxgl from 'mapbox-gl';
// Set Mapbox token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
// Helper function to calculate total distance from route segments
const calculateTotalDistance = (route) => {
    return route.routes.reduce((total, segment) => {
        const feature = segment.geojson?.features?.[0];
        if (feature?.properties?.distance) {
            return total + feature.properties.distance;
        }
        return total;
    }, 0);
};
// Helper function to calculate total elevation from route segments
const calculateTotalElevation = (route) => {
    return route.routes.reduce((total, segment) => {
        const feature = segment.geojson?.features?.[0];
        if (feature?.properties?.elevationGain) {
            return total + feature.properties.elevationGain;
        }
        return total;
    }, 0);
};
export const MapBrowser = () => {
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        sortBy: 'recent',
        sortOrder: 'desc'
    });
    useEffect(() => {
        const fetchMaps = async () => {
            try {
                setLoading(true);
                setError(null);
                const routes = await publicRouteService.listRoutes(filters.type);
                // Sort routes based on filters
                const sortedRoutes = [...routes].sort((a, b) => {
                    const multiplier = filters.sortOrder === 'desc' ? -1 : 1;
                    switch (filters.sortBy) {
                        case 'views':
                            return multiplier * (b.viewCount - a.viewCount);
                        case 'recent':
                            return multiplier * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        case 'distance':
                            return multiplier * (calculateTotalDistance(b) - calculateTotalDistance(a));
                        case 'elevation':
                            return multiplier * (calculateTotalElevation(b) - calculateTotalElevation(a));
                        default:
                            return 0;
                    }
                });
                setMaps(sortedRoutes);
            }
            catch (error) {
                setError('Failed to load maps. Please try again later.');
                console.error('Error fetching maps:', error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchMaps();
    }, [filters]);
    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };
    if (loading) {
        return (_jsx("div", { className: "flex justify-center items-center min-h-screen", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" }) }));
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsx("div", { className: "mb-8 bg-white shadow rounded-lg p-4", children: _jsxs("div", { className: "flex flex-wrap gap-4", children: [_jsxs("select", { className: "rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500", value: filters.type || '', onChange: (e) => handleFilterChange({
                                type: e.target.value ? e.target.value : undefined
                            }), children: [_jsx("option", { value: "", children: "All Types" }), _jsx("option", { value: "tourism", children: "Tourism" }), _jsx("option", { value: "event", children: "Event" }), _jsx("option", { value: "bikepacking", children: "Bikepacking" }), _jsx("option", { value: "single", children: "Single" })] }), _jsxs("select", { className: "rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500", value: filters.sortBy, onChange: (e) => handleFilterChange({ sortBy: e.target.value }), children: [_jsx("option", { value: "recent", children: "Recently Added" }), _jsx("option", { value: "views", children: "Most Viewed" }), _jsx("option", { value: "distance", children: "Distance" }), _jsx("option", { value: "elevation", children: "Elevation Gain" })] }), _jsxs("select", { className: "rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500", value: filters.sortOrder, onChange: (e) => handleFilterChange({ sortOrder: e.target.value }), children: [_jsx("option", { value: "desc", children: "Descending" }), _jsx("option", { value: "asc", children: "Ascending" })] })] }) }), _jsx("div", { className: "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3", children: maps.map((map) => (_jsxs(Link, { to: `/maps/${map.id}`, className: "block bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200", children: [_jsx("div", { className: "aspect-w-16 aspect-h-9 bg-gray-200", children: _jsx(MapPreview, { center: map.mapState.center, zoom: map.mapState.zoom, geojson: map.routes[0]?.geojson }) }), _jsxs("div", { className: "p-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: map.name }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: map.type.charAt(0).toUpperCase() + map.type.slice(1) }), _jsxs("div", { className: "mt-2 flex items-center text-sm text-gray-500", children: [_jsxs("span", { children: [map.viewCount, " views"] }), _jsx("span", { className: "mx-2", children: "\u2022" }), _jsx("span", { children: new Date(map.createdAt).toLocaleDateString() })] })] })] }, map.id))) }), error && (_jsxs("div", { className: "text-center py-12", children: [_jsx("h3", { className: "text-lg font-medium text-red-600", children: error }), _jsx("button", { onClick: () => handleFilterChange(filters), className: "mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700", children: "Try Again" })] })), !error && maps.length === 0 && (_jsxs("div", { className: "text-center py-12", children: [_jsx("h3", { className: "text-lg font-medium text-gray-900", children: "No maps found" }), _jsx("p", { className: "mt-2 text-sm text-gray-500", children: "Try adjusting your filters" })] }))] }));
};
